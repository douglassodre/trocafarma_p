import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookUrl =
    process.env.STRIPE_WEBHOOK_URL ||
    "https://sfbmelnwdslnyyyzxlzb.functions.supabase.co/stripe-webhook";

const enabledEvents = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.trial_will_end",
    "invoice.payment_failed",
];

if (!stripeSecretKey) {
    console.error("Missing STRIPE_SECRET_KEY.");
    process.exit(1);
}

if (!stripeSecretKey.startsWith("sk_live_")) {
    console.error("STRIPE_SECRET_KEY must be a live key (sk_live_) to create the production webhook.");
    process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
});

const existing = await stripe.webhookEndpoints.list({ limit: 100 });
const existingEndpoint = existing.data.find((endpoint) => endpoint.url === webhookUrl);

if (existingEndpoint) {
    console.log("Webhook endpoint already exists:", existingEndpoint.id);
    console.log("Stripe does not reveal an existing endpoint secret. Create a new endpoint or reveal/copy it in the Dashboard if needed.");
    process.exit(0);
}

const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: enabledEvents,
});

console.log("Webhook endpoint created:", endpoint.id);
console.log("Set STRIPE_WEBHOOK_SECRET to:", endpoint.secret);
