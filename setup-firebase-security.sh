#!/bin/bash

# Firebase Setup and Configuration Script
# Run this script to initialize Firebase Authentication for your project

echo "🔒 Sai Krishna Textiles - Firebase Security Setup"
echo "=================================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

echo "✅ Firebase CLI found"
echo ""

# Login to Firebase
echo "📝 Logging into Firebase..."
firebase login

echo ""
echo "🔐 Firebase Security Setup Instructions"
echo "========================================"
echo ""

echo "1️⃣  CREATE ADMIN USER IN FIREBASE CONSOLE:"
echo "   - Go to: https://console.firebase.google.com/project/billingsystemandinventorysyste/authentication/users"
echo "   - Click 'Add User'"
echo "   - Email: admin@saikrishna.local"
echo "   - Password: SecureAdminPass@123 (CHANGE THIS!)"
echo ""

echo "2️⃣  UPDATE FIRESTORE SECURITY RULES:"
echo "   - Go to: https://console.firebase.google.com/project/billingsystemandinventorysyste/firestore/rules"
echo "   - Copy rules from SECURITY_SETUP.md"
echo "   - Click Publish"
echo ""

echo "3️⃣  SET CUSTOM CLAIMS (Optional - for admin role):"
echo "   - Use Firebase Cloud Functions or CLI"
echo ""

echo "4️⃣  TEST LOGIN:"
echo "   - Open: http://localhost:8002"
echo "   - Email: admin@saikrishna.local"
echo "   - Password: SecureAdminPass@123"
echo ""

echo "5️⃣  DEPLOY TO PRODUCTION:"
echo "   - firebase deploy"
echo ""

echo "✅ Setup complete! Your app is now secure."
echo ""
echo "⚠️  REMEMBER:"
echo "   - Change default passwords immediately"
echo "   - Enable 2FA in Firebase Console"
echo "   - Review Firestore security rules"
echo "   - Keep .env file in .gitignore"
echo "   - Use HTTPS in production"
