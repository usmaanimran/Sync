"use server";

import { v2 as cloudinary } from "cloudinary";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import crypto from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Generates an HMAC signature for secure Cloudinary uploads.
 * Restricts client uploads to a server-generated public ID to prevent asset overwriting.
 * 
 * @param prefix - Optional prefix for the generated public ID.
 * @param folder - Target folder in Cloudinary.
 * @returns Upload credentials and cryptographic signature.
 */
export async function getCloudinarySignature(prefix: string = "upload", folder: string = "nexus_uploads") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: Active session required." };
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const safePrefix = prefix.replace(/[^a-zA-Z0-9]/g, "");
  const safePublicId = `${safePrefix}_${session.user.id}_${crypto.randomBytes(8).toString("hex")}`;

  // Parameters to sign must exactly match the client-side POST body payload
  const paramsToSign = {
    folder: folder,
    public_id: safePublicId,
    timestamp: timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    success: true,
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "drdy6ktb6",
    folder,
    publicId: safePublicId,
  };
}