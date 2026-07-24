"use server";

import { v2 as cloudinary } from "cloudinary";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Generates a one-time cryptographic HMAC signature on the server.
 * Allows the client to upload directly to Cloudinary without exposing API secrets
 * while preventing unauthorized upload quota abuse.
 */
export async function getCloudinarySignature(publicId: string, folder: string = "nexus_uploads") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized: Active session required." };
  }

  const timestamp = Math.round(new Date().getTime() / 1000);

  // Exact parameters to sign (must match the client POST body)
  const paramsToSign = {
    folder: folder,
    public_id: publicId,
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
  };
}