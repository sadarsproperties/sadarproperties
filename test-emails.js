import { buildWelcomeEmailHtml, buildWelcomeEmailText, sendWelcomeEmail, sendActivityNotification } from './server/resend.js';

console.log("=== WELCOME EMAIL HTML SAMPLE ===");
console.log(buildWelcomeEmailHtml("John Doe"));

console.log("\n=== WELCOME EMAIL TEXT SAMPLE ===");
console.log(buildWelcomeEmailText("John Doe"));

console.log("\n=== ACTIVITY EMAIL SAMPLE ===");
// Stubbing process.env to see what it would log if RESEND_API_KEY is not set
process.env.RESEND_API_KEY = "";
await sendWelcomeEmail("test@example.com", "John Doe");

await sendActivityNotification({
  userEmail: "test@example.com",
  userName: "John Doe",
  activityName: "Added Property",
  detailsHtml: "<p><strong>Address:</strong> 123 Main St</p><p><strong>Price:</strong> $250,000</p>",
  detailsText: "Added Property:\nAddress: 123 Main St\nPrice: $250,000"
});
