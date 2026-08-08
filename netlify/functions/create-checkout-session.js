const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items } = JSON.parse(event.body || '{}');

    if (!Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty.' }) };
    }

    // quantity is always 1 per item, since every piece is one-of-a-kind
    const line_items = items.map((item) => ({
      price: item.priceId,
      quantity: 1
    }));

    const siteUrl = process.env.SITE_URL || 'https://alonaceramics.netlify.app';

const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items,
  shipping_address_collection: {
    allowed_countries: ['US']
  },
  phone_number_collection: {
    enabled: true
  },
  automatic_tax: {
    enabled: true
  },
  success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${siteUrl}/shop.html`
});

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not create checkout session.' })
    };
  }
};