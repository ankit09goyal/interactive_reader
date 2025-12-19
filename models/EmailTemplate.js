import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

// EMAIL TEMPLATE SCHEMA
// Stores per-admin email templates for user access notifications
const emailTemplateSchema = mongoose.Schema(
  {
    // Reference to the admin user who owns this template
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    // Email subject template
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    // HTML email body template
    htmlBody: {
      type: String,
      required: true,
    },
    // Plain text email body template (optional)
    textBody: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Add plugin that converts mongoose to json
emailTemplateSchema.plugin(toJSON);

export default mongoose.models.EmailTemplate ||
  mongoose.model("EmailTemplate", emailTemplateSchema);
