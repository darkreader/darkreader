#!/bin/bash

# Array of websites to fix
websites=("flipkart" "indianexpress" "myntra" "paytm" "phonepe" "swiggy" "thehindu" "unacademy" "vedantu" "zomato")

for website in "${websites[@]}"; do
    echo "🔧 Fixing ${website}.com content image inversion..."
    
    # Checkout the branch
    git checkout "fix/${website}-dark-theme" > /dev/null 2>&1
    
    # Apply the conservative fix - this removes all img[alt*] selectors and uses only class-based selectors
    sed -i '' "/^${website}\.com$/,/^CSS$/ {
        /header img\[alt\*/d
        /nav img\[alt\*/d
        /\.navbar img\[alt\*/d
        /\.header img\[alt\*/d
        /\.top-bar img\[alt\*/d
        /\.header-logo$/ a\\
.site-logo\\
.main-logo\\
header .logo img\\
nav .logo img\\
.navbar .logo img
    }" src/config/dynamic-theme-fixes.config
    
    # Commit and push
    git add src/config/dynamic-theme-fixes.config
    git commit -m "Fix content image inversion for ${website}.com - use conservative logo selectors only"
    git push origin "fix/${website}-dark-theme"
    
    echo "✅ Fixed ${website}.com"
done

echo "🎉 All websites fixed!"
