#!/bin/bash

echo "🧪 LOCAL TESTING SCRIPT FOR DARK READER CHANGES"
echo "=============================================="
echo ""

echo "📋 Instructions for local testing:"
echo ""
echo "1️⃣  INSTALL DARK READER LOCALLY:"
echo "   npm install"
echo "   npm run build"
echo ""
echo "2️⃣  LOAD INTO BROWSER:"
echo "   • Chrome: Go to chrome://extensions"
echo "   • Enable 'Developer mode'"
echo "   • Click 'Load unpacked'"
echo "   • Select the 'build' folder"
echo ""
echo "3️⃣  TEST EACH WEBSITE:"

declare -a websites=("byjus" "flipkart" "indianexpress" "myntra" "ndtv" "paytm" "phonepe" "swiggy" "thehindu" "unacademy" "vedantu" "zomato")

for website in "${websites[@]}"; do
    echo "   • https://${website}.com - Check logo inverts, content images don't"
done

echo ""
echo "4️⃣  WHAT TO VERIFY:"
echo "   ✅ Logos in header/navigation are inverted (darker/lighter)"
echo "   ✅ Content images remain normal (not inverted)"
echo "   ✅ Search boxes have proper dark background"
echo "   ❌ No product/course/news images are inverted"
echo ""

echo "5️⃣  QUICK TEST BRANCHES:"
echo "   To test a specific website:"
echo "   git checkout fix/WEBSITE-dark-theme"
echo "   npm run build"
echo "   Reload extension in browser"
echo ""

echo "🚀 READY TO TEST!"
echo "If everything looks good, your PRs are ready for maintainer review!"
