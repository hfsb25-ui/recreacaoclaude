import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get active WhatsApp config
    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ message: "WhatsApp integration not configured or inactive" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get pending reminders for activities starting in 9-11 minutes
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Calculate time window: 9-11 minutes from now
    const minFrom = new Date(now.getTime() + 9 * 60 * 1000);
    const minTo = new Date(now.getTime() + 11 * 60 * 1000);

    const timeFrom = `${String(minFrom.getHours()).padStart(2, "0")}:${String(minFrom.getMinutes()).padStart(2, "0")}:00`;
    const timeTo = `${String(minTo.getHours()).padStart(2, "0")}:${String(minTo.getMinutes()).padStart(2, "0")}:00`;

    // Get pending reminders
    const { data: reminders } = await supabase
      .from("whatsapp_reminders")
      .select("id, guest_id, activity_id")
      .eq("status", "pending");

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending reminders", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get activity IDs
    const activityIds = [...new Set(reminders.map((r) => r.activity_id))];

    // Get activities that start in the time window
    const { data: activities } = await supabase
      .from("activities")
      .select("id, name, start_time, activity_date")
      .in("id", activityIds)
      .eq("activity_date", todayStr)
      .gte("start_time", timeFrom)
      .lte("start_time", timeTo);

    if (!activities || activities.length === 0) {
      return new Response(
        JSON.stringify({ message: "No activities in the reminder window", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activityMap = new Map(activities.map((a) => [a.id, a]));

    // Filter reminders that match activities in the window
    const remindersToSend = reminders.filter((r) => activityMap.has(r.activity_id));

    if (remindersToSend.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reminders to send right now", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get guest IDs and fetch their data
    const guestIds = [...new Set(remindersToSend.map((r) => r.guest_id))];
    const { data: guests } = await supabase
      .from("guests")
      .select("id, name, phone")
      .in("id", guestIds);

    const guestMap = new Map(guests?.map((g) => [g.id, g]) || []);

    let sentCount = 0;
    let failCount = 0;

    for (const reminder of remindersToSend) {
      const guest = guestMap.get(reminder.guest_id);
      const activity = activityMap.get(reminder.activity_id);

      if (!guest || !guest.phone || !activity) {
        await supabase
          .from("whatsapp_reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id);
        failCount++;
        continue;
      }

      const startTime = activity.start_time.substring(0, 5);
      const message = `🏨 Olá, ${guest.name}! 🎉\n\nLembrete: a atividade *"${activity.name}"* começa em 10 minutos (às ${startTime}).\n\nNos vemos lá! 🎮`;

      try {
        const url = `${config.instance_url}/message/sendText/${config.instance_name}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.api_key,
          },
          body: JSON.stringify({
            number: guest.phone,
            text: message,
          }),
        });

        if (response.ok) {
          await supabase
            .from("whatsapp_reminders")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", reminder.id);
          sentCount++;
        } else {
          const errorData = await response.text();
          console.error(`Failed to send to ${guest.phone}:`, errorData);
          await supabase
            .from("whatsapp_reminders")
            .update({ status: "failed" })
            .eq("id", reminder.id);
          failCount++;
        }
      } catch (err) {
        console.error(`Error sending to ${guest.phone}:`, err);
        await supabase
          .from("whatsapp_reminders")
          .update({ status: "failed" })
          .eq("id", reminder.id);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Reminders processed", sent: sentCount, failed: failCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-whatsapp-reminder:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
