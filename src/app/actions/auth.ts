"use server";

// ─── SEC-02 FIX ────────────────────────────────────────────────────────────
// Import Node.js native crypto module for CSPRNG-backed OTP generation.
// Math.random() is a seeded PRNG and is predictable; crypto.randomInt() is not.
import crypto from "crypto";
import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

const resend = new Resend(process.env.RESEND_API_KEY);

// 🛡️ CYBERSECURITY: Edge Rate Limiter configuration via Upstash Redis
// Defends auth endpoints against high-velocity automated botnets & script attacks
const authRateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "60 s"), // Strict threshold: 5 operations per minute per IP
  analytics: true,
  prefix: "@upstash/ratelimit/nexus_auth",
});

// Helper utility to enforce rate limits per client IP address
async function assertRateLimit(actionName: string) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const { success } = await authRateLimiter.limit(`${actionName}_${ip}`);
  
  if (!success) {
    throw new Error("Too many authentication requests. System access throttled. Please wait 60 seconds.");
  }
}

// 1. THE 4-TIER FAILOVER EMAIL ENGINE
// ─── SEC-06 FIX ────────────────────────────────────────────────────────────
// Removed the hardcoded `throw new Error("Bypassing Brevo for local testing")`
// dead-code bypass that was permanently skipping the Brevo primary provider.
// The failover chain now executes as designed: Brevo → Resend → Sender → CloudMailin.
async function sendVerificationEmail(email: string, otp: string) {
  const emailSubject = "Verify your Nexus Account";
  const senderEmail = "onboarding@resend.dev"; 
  const senderName = "Nexus";
  const emailHtml = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #080b0e; color: #ffffff;">
      <h1 style="color: #ffffff;">Welcome to the Nexus</h1>
      <p style="color: #cccccc;">Your verification code is: <strong style="font-size: 24px; color: #ffffff; letter-spacing: 2px;">${otp}</strong></p>
      <p style="color: #888888;">This code expires in 15 minutes.</p>
    </div>
  `;

  try {
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: email }],
        subject: emailSubject,
        htmlContent: emailHtml,
      }),
    });

    if (!brevoResponse.ok) throw new Error("Brevo failed.");
    return { success: true, provider: "brevo" };

  } catch (brevoError) {
    console.warn("Brevo failover engaged. Routing to Resend...");

    try {
      const { error: resendError } = await resend.emails.send({
        from: `${senderName} <${senderEmail}>`,
        to: email, 
        subject: emailSubject,
        html: emailHtml,
      });

      if (resendError) throw new Error("Resend failed.");
      return { success: true, provider: "resend" };

    } catch (resendError) {
      console.warn("Resend failover engaged. Routing to Sender...");

      try {
        const senderResponse = await fetch("https://api.sender.net/v2/message/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.SENDER_API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            from: { email: senderEmail, name: senderName },
            to: { email: email },
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (!senderResponse.ok) throw new Error("Sender failed.");
        return { success: true, provider: "sender" };

      } catch (senderError) {
        console.warn("Sender failover engaged. Deploying CloudMailin...");

        const cloudmailinResponse = await fetch(`https://api.cloudmailin.com/api/v0.1/${process.env.CLOUDMAILIN_USERNAME}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.CLOUDMAILIN_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${senderName} <${senderEmail}>`,
            to: [email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (!cloudmailinResponse.ok) {
           console.error("CRITICAL SECURITY MONITOR: Complete email infrastructure outage detected.");
           return { success: false, error: "Complete email engine failure." };
        }
        return { success: true, provider: "cloudmailin" };
      }
    }
  }
}

// 2. REAL USERNAME CHECK DIRECT FROM DATABASE
export async function isUsernameAvailable(username: string) {
  const { data: user, error } = await supabase
    .from("users")
    .select("is_verified, token_expiry")
    .eq("username", username.toLowerCase().trim())
    .maybeSingle();

  if (error) return false;
  if (!user) return true; 
  if (user.is_verified) return false;

  const now = new Date();
  const expiryDate = new Date(user.token_expiry);
  
  if (now > expiryDate) return true; 
  return false; 
}

// 3. REGISTER USER ACTION
export async function registerUser(formData: FormData) {
  // DDoS Mitigation check
  await assertRateLimit("register");

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const username = formData.get("username") as string;
  const birthday = formData.get("birthday") as string;

  if (!email || !password || !username) {
    throw new Error("Required fields are missing.");
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanUsername = username.toLowerCase().trim();
  const now = new Date();

  // 🧹 1. SWEEP THE USERNAME
  const { data: existingUsername } = await supabase
    .from("users")
    .select("id, email, is_verified, token_expiry")
    .eq("username", cleanUsername)
    .maybeSingle();

  if (existingUsername) {
    if (existingUsername.is_verified) {
      throw new Error("This username is already permanently taken.");
    }

    const expiryDate = new Date(existingUsername.token_expiry);
    
    if (now < expiryDate && existingUsername.email !== cleanEmail) {
      throw new Error("This username is currently pending verification. Try again later.");
    } 
    
    if (now >= expiryDate) {
      await supabase.from("users").delete().eq("id", existingUsername.id);
    }
  }

  // 🧹 2. CHECK THE EMAIL & PREVENT OVERWRITE HIJACKING
  const { data: existingEmail } = await supabase
    .from("users")
    .select("id, is_verified, token_expiry")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existingEmail) {
    if (existingEmail.is_verified) {
      throw new Error("This email is already registered.");
    }

    // ⚔️ CYBERSECURITY FIX: Protect active, unverified registration states from account takeover attempts
    const originalExpiry = new Date(existingEmail.token_expiry);
    if (now < originalExpiry) {
      throw new Error("An active registration setup is already pending for this email address. Please try again when the 15-minute window expires.");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  // ─── SEC-02 FIX ──────────────────────────────────────────────────────────
  // crypto.randomInt(100000, 1000000) uses a CSPRNG (cryptographically secure
  // pseudorandom number generator). Unlike Math.random(), it is not seeded
  // from a predictable state and its output cannot be reverse-engineered.
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // 🔄 3. INSERT OR EXPIRED-OVERWRITE
  if (existingEmail && !existingEmail.is_verified) {
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_hash: hashedPassword,
        full_name: fullName,
        username: cleanUsername,
        birthday: birthday,
        verification_token: otp,
        token_expiry: otpExpiry,
        failed_otp_attempts: 0 // Reset brute force counter on hard retry
      })
      .eq("id", existingEmail.id);

    if (updateError) throw new Error("Failed to update registration data securely.");
  } else {
    const { error: insertError } = await supabase
      .from("users")
      .insert([
        {
          email: cleanEmail,
          password_hash: hashedPassword,
          full_name: fullName,
          username: cleanUsername,
          birthday: birthday,
          is_verified: false, 
          verification_token: otp, 
          token_expiry: otpExpiry,
          failed_otp_attempts: 0
        }
      ]);

    if (insertError) throw new Error("Registration failed framework error.");
  }

  await sendVerificationEmail(cleanEmail, otp);

  return { success: true, email: cleanEmail };
}

// 4. VERIFY OTP ACTION
export async function verifyUserEmail(email: string, otp: string) {
  await assertRateLimit("verify_otp");

  const cleanEmail = email.toLowerCase().trim();

  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("verification_token, token_expiry, is_verified, failed_otp_attempts")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (fetchError || !user) {
    return { success: false, error: "Access Denied." };
  }

  if (user.is_verified) {
    return { success: false, error: "Account is already verified." };
  }

  // 🛡️ CYBERSECURITY FIX: Brute-Force Shield logic
  // Automatically self-destructs authorization tokens upon reaching 5 invalid attempts
  if (user.failed_otp_attempts >= 5) {
    return { success: false, error: "Maximum verification validation attempts exceeded. Request a new token." };
  }

  // ─── SEC-10 FIX ──────────────────────────────────────────────────────────
  // Expiry is now checked BEFORE token comparison.
  // Previously, a valid-but-expired OTP could pass the token check and return
  // success. Checking expiry first closes this window entirely.
  if (new Date() > new Date(user.token_expiry)) {
    return { success: false, error: "Verification code has expired. Please request a new one." };
  }

  if (user.verification_token !== otp) {
    const freshAttempts = (user.failed_otp_attempts || 0) + 1;
    
    if (freshAttempts >= 5) {
      // Annihilate the token state immediately
      await supabase.from("users").update({ 
        verification_token: null, 
        token_expiry: null,
        failed_otp_attempts: 5
      }).eq("email", cleanEmail);
      
      return { success: false, error: "Too many failed attempts. Code locked out. Please request a new code." };
    }

    // Record the incremented failed attempt back to the cloud database record
    await supabase.from("users").update({ failed_otp_attempts: freshAttempts }).eq("email", cleanEmail);
    return { success: false, error: `Invalid verification code. ${5 - freshAttempts} attempts remaining.` };
  }

  // Authorize completely and clear structural tokens out of the table row
  const { error: updateError } = await supabase
    .from("users")
    .update({ 
      is_verified: true, 
      verification_token: null, 
      token_expiry: null,
      failed_otp_attempts: 0
    })
    .eq("email", cleanEmail);

  if (updateError) return { success: false, error: "Internal session creation fault." };

  return { success: true };
}

// 5. RESEND OTP ACTION
export async function resendVerificationCode(email: string) {
  await assertRateLimit("resend_otp");

  const cleanEmail = email.toLowerCase().trim();
  // ─── SEC-02 FIX ──────────────────────────────────────────────────────────
  const newOtp = crypto.randomInt(100000, 1000000).toString();
  const newOtpExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // ─── SEC-05 FIX ──────────────────────────────────────────────────────────
  // `failed_otp_attempts` is intentionally NOT reset here.
  // Resetting it allowed an attacker to loop: fail 4 times → resend → fail 4
  // more → repeat indefinitely, bypassing the 5-attempt lockout.
  // The failure counter must persist across resend requests.
  const { error } = await supabase
    .from("users")
    .update({ 
      verification_token: newOtp, 
      token_expiry: newOtpExpiry,
    })
    .eq("email", cleanEmail);

  if (error) return { success: false, error: "Token mutation failed." };

  await sendVerificationEmail(cleanEmail, newOtp);
  return { success: true };
}

// 6. REQUEST PASSWORD RESET
export async function requestPasswordReset(email: string) {
  await assertRateLimit("request_reset");
  const cleanEmail = email.toLowerCase().trim();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle();

  // Return blind success message to prevent user enumeration discovery
  if (!user) return { success: true };

  // ─── SEC-02 FIX ──────────────────────────────────────────────────────────
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await supabase
    .from("users")
    .update({ 
      verification_token: otp, 
      token_expiry: otpExpiry,
      failed_otp_attempts: 0 
    })
    .eq("id", user.id);

  await sendVerificationEmail(cleanEmail, otp);
  return { success: true };
}

// 7. EXECUTE PASSWORD RESET
export async function resetPassword(email: string, otp: string, newPassword: string) {
  await assertRateLimit("execute_reset");
  const cleanEmail = email.toLowerCase().trim();

  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("id, verification_token, token_expiry, password_hash, failed_otp_attempts")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (fetchError || !user) return { success: false, error: "Invalid context operational scope." };
  if (user.failed_otp_attempts >= 5) return { success: false, error: "Token locked out due to abuse." };

  // ─── SEC-10 FIX ──────────────────────────────────────────────────────────
  // Expiry is checked BEFORE token comparison to prevent expired-token acceptance.
  if (new Date() > new Date(user.token_expiry)) {
    return { success: false, error: "Code lifecycle has expired." };
  }

  if (user.verification_token !== otp) {
    const freshAttempts = (user.failed_otp_attempts || 0) + 1;
    if (freshAttempts >= 5) {
      await supabase.from("users").update({ verification_token: null, token_expiry: null, failed_otp_attempts: 5 }).eq("id", user.id);
      return { success: false, error: "Too many failed invalid verification entry executions. Token self-destructed." };
    }
    await supabase.from("users").update({ failed_otp_attempts: freshAttempts }).eq("id", user.id);
    return { success: false, error: "Invalid verification authorization key." };
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
  if (isSamePassword) {
    return { success: false, error: "Your new password cannot match historical records." };
  }

  const newHashedPassword = await bcrypt.hash(newPassword, 10);

  const { error: updateError } = await supabase
    .from("users")
    .update({ 
      password_hash: newHashedPassword,
      verification_token: null, 
      token_expiry: null,
      failed_otp_attempts: 0 
    })
    .eq("id", user.id);

  if (updateError) return { success: false, error: "Security database transaction update failed." };

  return { success: true };
}