import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config({ path: ".env.local" });
dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    console.error("Missing STRIPE_SECRET_KEY. Use your live sk_live_ key only in the environment.");
    process.exit(1);
}

if (!stripeSecretKey.startsWith("sk_live_")) {
    console.error("STRIPE_SECRET_KEY must be a live key (sk_live_) to create the production price.");
    process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
});

const product = await stripe.products.create({
    name: "Assinatura Trocafarma",
});

const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 2000,
    currency: "brl",
    recurring: {
        interval: "month",
    },
});

console.log("Product created:", product.id);
console.log("Price created:", price.id);
console.log("Set STRIPE_PRICE_ID to:", price.id);
