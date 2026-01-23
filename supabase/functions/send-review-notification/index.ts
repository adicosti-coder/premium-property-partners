import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewNotificationRequest {
  propertyName: string;
  guestName: string;
  rating: number;
  title?: string;
  content: string;
  guestEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Review notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyName, guestName, rating, title, content, guestEmail }: ReviewNotificationRequest = await req.json();

    console.log("Received review notification request:", { propertyName, guestName, rating });

    // Create Supabase client to get admin emails
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(JSON.stringify({ message: "No admins to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get admin emails from profiles
    const adminIds = adminRoles.map((r) => r.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", adminIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw profilesError;
    }

    const adminEmails = profiles?.filter((p) => p.email).map((p) => p.email) || [];

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(JSON.stringify({ message: "No admin emails found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Sending notification to admins:", adminEmails);

    // Generate star rating HTML
    const starsHtml = Array(5)
      .fill(0)
      .map((_, i) => (i < rating ? "★" : "☆"))
      .join("");

    const ratingColor = rating >= 4 ? "#22c55e" : rating >= 3 ? "#f59e0b" : "#ef4444";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Review nou primit</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #d4af37; margin: 0; font-size: 24px;">📝 Review Nou Primit</h1>
            </div>
            
            <div style="padding: 30px;">
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Proprietate</p>
                <p style="margin: 0; color: #1a1a2e; font-size: 18px; font-weight: 600;">${propertyName}</p>
              </div>

              <table style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="width: 50%; vertical-align: top;">
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px;">
                      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Oaspete</p>
                      <p style="margin: 0; color: #1a1a2e; font-size: 16px; font-weight: 500;">${guestName}</p>
                      ${guestEmail ? `<p style="margin: 5px 0 0 0; color: #888; font-size: 14px;">${guestEmail}</p>` : ""}
                    </div>
                  </td>
                  <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Rating</p>
                      <p style="margin: 0; color: ${ratingColor}; font-size: 24px;">${starsHtml}</p>
                      <p style="margin: 5px 0 0 0; color: #1a1a2e; font-weight: 600;">${rating}/5</p>
                    </div>
                  </td>
                </tr>
              </table>

              ${title ? `
              <div style="margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Titlu</p>
                <p style="margin: 0; color: #1a1a2e; font-size: 16px; font-weight: 500;">${title}</p>
              </div>
              ` : ""}

              <div style="margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Conținut Review</p>
                <div style="background: #f8f9fa; border-left: 4px solid #d4af37; padding: 15px; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${content}</p>
                </div>
              </div>

              <div style="background: #fff3cd; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⚠️ Acest review așteaptă aprobarea. Accesează panoul de administrare pentru a-l publica sau șterge.
                </p>
              </div>

              <a href="https://realtrustaparthotel.lovable.app/admin" 
                 style="display: block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #1a1a2e; text-align: center; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Gestionează Review-uri
              </a>
            </div>

            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #888; font-size: 12px;">
                © ${new Date().getFullYear()} RealTrust. Toate drepturile rezervate.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RealTrust Reviews <onboarding@resend.dev>",
        to: adminEmails,
        subject: `📝 Review nou: ${rating}★ pentru ${propertyName} de la ${guestName}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Resend API response:", emailResult);

    if (!emailResponse.ok) {
      console.error("Error from Resend API:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent successfully");

    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-review-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
