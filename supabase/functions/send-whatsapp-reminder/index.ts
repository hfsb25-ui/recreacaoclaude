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

    // 2. Horário de Brasília (o servidor roda em UTC; as atividades são cadastradas no horário local)
    const TZ = "America/Sao_Paulo";
    const localParts = (d: Date) => {
      const p = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
        }).formatToParts(d).map((x) => [x.type, x.value])
      );
      return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}:${p.second}` };
    };

    const now = new Date();
    const nowLocal = localParts(now);
    const todayStr = nowLocal.date;
    // Janela: atividades que começam a partir de agora até daqui a 11 minutos
    // (a função roda a cada 2 minutos, então cada lembrete sai ~10 min antes)
    const windowEnd = localParts(new Date(now.getTime() + 11 * 60 * 1000));
    const timeFrom = nowLocal.time;
    const timeTo = windowEnd.date === todayStr ? windowEnd.time : "23:59:59";

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
      .gt("start_time", timeFrom)
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
      const firstName = String(guest.name || "").trim().split(/\s+/)[0] || "";
      const message = `🏨 Olá, ${firstName}! 🎉\n\nLembrete: a atividade *"${activity.name}"* começa às ${startTime}.\n\nNos vemos lá! 🎮`;
      let number = String(guest.phone).replace(/\D/g, "");
      if (number.length === 10 || number.length === 11) number = `55${number}`;

      try {
        const url = `${String(config.instance_url).replace(/\/+$/, "")}/message/sendText/${config.instance_name}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.api_key,
          },
          body: JSON.stringify({
            number,
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
