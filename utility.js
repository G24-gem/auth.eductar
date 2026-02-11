const axios = require("axios");

async function getInterswitchAppToken() {
  try {
    const credentials = Buffer.from(
      `${process.env.INTERSWITCH_CLIENT_ID}:${process.env.INTERSWITCH_CLIENT_SECRET}`
    ).toString('base64');

    const res = await axios.post(
      "https://passport-v2.k8.isw.la/passport/oauth/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        scope: "profile" // Might need more scopes
      }),
      {
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    console.log("✅ Token retrieved successfully");
    console.log("Token scopes:", res.data.scope); // Debug: see what scopes you have
    return res.data.access_token;
  } catch (error) {
    console.error("Token Error:", error.response?.data || error.message);
    throw new Error("Failed to get Interswitch token");
  }
}

async function verifyNIN(nin, firstName, lastName, token) {
  try {
    console.log("🔍 Attempting NIN verification for:", { nin, firstName, lastName });
    
    const response = await axios.post(
      "https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/verify/identity/nin",
      {
        nin: nin,
        firstName: firstName,
        lastName: lastName
      },
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;
  } catch (error) {
    // More detailed error logging
    console.error("NIN Verification Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    throw error;
  }
}

module.exports = {
  getInterswitchAppToken,
  verifyNIN
};