import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  targetGuestIds?: string[]; // If provided, only send to these guests
  activityId?: string;
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  guest_id: string;
}

// Helper function to send push notification
async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationRequest
) {
  try {
    const pushData = {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-192x192.png',
        data: payload.data || {},
      },
    };

    // Use Web Push API
    const webpushEndpoint = subscription.endpoint;
    
    console.log(`Sending notification to ${webpushEndpoint}`);
    
    // Note: For production, you'll need to implement proper VAPID authentication
    // This is a simplified version
    const response = await fetch(webpushEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: JSON.stringify(pushData),
    });

    if (!response.ok) {
      console.error(`Failed to send notification: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log('Notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: PushNotificationRequest = await req.json();

    // Validate payload
    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    
    // Filter by guest IDs if provided
    if (payload.targetGuestIds && payload.targetGuestIds.length > 0) {
      query = query.in('guest_id', payload.targetGuestIds);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send notifications to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendPushNotification(sub, payload))
    );

    const successCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value === true
    ).length;

    console.log(`Sent ${successCount} out of ${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({
        message: 'Notifications sent',
        sent: successCount,
        total: subscriptions.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
