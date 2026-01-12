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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get reset configuration
    const { data: resetConfig, error: configError } = await supabase
      .from("reset_config")
      .select("*")
      .single();

    if (configError || !resetConfig) {
      console.log("No reset config found");
      return new Response(
        JSON.stringify({ message: "No reset config found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current day (0 = Sunday, 1 = Monday, etc.) and time in Brazil timezone
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentDay = brazilTime.getDay();
    const currentHour = brazilTime.getHours();
    const currentMinute = brazilTime.getMinutes();
    
    // Parse reset time (format: "HH:MM")
    const [resetHour, resetMinute] = (resetConfig.reset_time || "00:00").split(":").map(Number);

    // Check if today is a reset day
    const isResetDay = currentDay === resetConfig.reset_day_1 || currentDay === resetConfig.reset_day_2;
    
    // Check if it's within the reset time window (within 5 minutes of reset time)
    const isResetTime = currentHour === resetHour && Math.abs(currentMinute - resetMinute) <= 5;

    console.log(`Current day: ${currentDay}, Reset days: ${resetConfig.reset_day_1}, ${resetConfig.reset_day_2}`);
    console.log(`Current time: ${currentHour}:${currentMinute}, Reset time: ${resetHour}:${resetMinute}`);
    console.log(`Is reset day: ${isResetDay}, Is reset time: ${isResetTime}`);

    if (!isResetDay || !isResetTime) {
      return new Response(
        JSON.stringify({ 
          message: "Not reset time", 
          currentDay,
          currentTime: `${currentHour}:${currentMinute}`,
          resetDays: [resetConfig.reset_day_1, resetConfig.reset_day_2],
          resetTime: resetConfig.reset_time
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active period
    const { data: activePeriod, error: periodError } = await supabase
      .from("ranking_periods")
      .select("*")
      .eq("is_active", true)
      .single();

    if (periodError || !activePeriod) {
      console.log("No active period found");
      return new Response(
        JSON.stringify({ message: "No active period found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get top 3 guests
    const { data: topGuests, error: guestsError } = await supabase
      .from("guests")
      .select("*")
      .order("total_points", { ascending: false })
      .limit(3);

    if (guestsError || !topGuests || topGuests.length === 0) {
      console.log("No guests found, skipping winners save");
    } else {
      // Save winners
      const prizes = [
        "Mestre da Recreação",
        "Campeão da Diversão",
        "Estrela da Semana",
      ];

      const winnersData = await Promise.all(
        topGuests.map(async (guest, index) => {
          const { count } = await supabase
            .from("activity_checkins")
            .select("*", { count: "exact", head: true })
            .eq("guest_id", guest.id);

          return {
            ranking_period_id: activePeriod.id,
            guest_id: guest.id,
            guest_name: guest.name,
            room_number: guest.room_number,
            final_position: index + 1,
            total_points: guest.total_points || 0,
            total_checkins: count || 0,
            prize_name: prizes[index],
          };
        })
      );

      const { error: winnersError } = await supabase
        .from("ranking_winners")
        .insert(winnersData);

      if (winnersError) {
        console.error("Error saving winners:", winnersError);
      } else {
        console.log("Winners saved successfully");
      }
    }

    // Close active period
    await supabase
      .from("ranking_periods")
      .update({ is_active: false })
      .eq("id", activePeriod.id);

    // Delete all check-ins
    await supabase
      .from("activity_checkins")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Delete all guests
    await supabase
      .from("guests")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Create new period
    const newPeriodNumber = activePeriod.period_number + 1;
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    await supabase.from("ranking_periods").insert({
      period_number: newPeriodNumber,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    });

    console.log(`Reset completed! New period ${newPeriodNumber} created.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reset completed! New period ${newPeriodNumber} created.`,
        winnersCount: topGuests?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in auto-reset:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
