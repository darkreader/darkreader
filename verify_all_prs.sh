#!/bin/bash

echo "🔍 VERIFICATION SCRIPT FOR ALL 12 INDIAN WEBSITE PRs"
echo "=================================================="
echo ""

# List of all websites and their corresponding branches
declare -a websites=("byjus" "flipkart" "indianexpress" "myntra" "ndtv" "paytm" "phonepe" "swiggy" "thehindu" "unacademy" "vedantu" "zomato")

echo "✅ STEP 1: Verifying all branches exist..."
for website in "${websites[@]}"; do
    branch="fix/${website}-dark-theme"
    if git branch -r | grep -q "origin/${branch}"; then
        echo "  ✓ ${website}.com - Branch exists: ${branch}"
    else
        echo "  ❌ ${website}.com - Branch missing: ${branch}"
    fi
done

echo ""
echo "✅ STEP 2: Checking specific selectors in each PR..."
echo ""

for website in "${websites[@]}"; do
    echo "🔍 Checking ${website}.com configuration:"
    git checkout "fix/${website}-dark-theme" > /dev/null 2>&1
    
    # Check if the website section exists
    if grep -q "^${website}\.com" src/config/dynamic-theme-fixes.config; then
        echo "  ✓ Website section found"
        
        # Check for the specific scoped selectors
        if grep -A 10 "^${website}\.com" src/config/dynamic-theme-fixes.config | grep -q "header img\[alt"; then
            echo "  ✓ Has scoped header img selectors"
        else
            echo "  ❌ Missing scoped header img selectors"
        fi
        
        if grep -A 10 "^${website}\.com" src/config/dynamic-theme-fixes.config | grep -q "nav img\[alt"; then
            echo "  ✓ Has scoped nav img selectors"
        else
            echo "  ❌ Missing scoped nav img selectors"
        fi
        
        # Check for old broad selectors (should not exist)
        if grep -A 10 "^${website}\.com" src/config/dynamic-theme-fixes.config | grep -q "^img\[alt"; then
            echo "  ⚠️  Still has broad img selectors (NEEDS FIX)"
        else
            echo "  ✓ No broad img selectors found"
        fi
        
        echo "  📋 Current selectors:"
        grep -A 15 "^${website}\.com" src/config/dynamic-theme-fixes.config | grep -E "(INVERT|img\[|CSS)" | sed 's/^/    /'
        
    else
        echo "  ❌ Website section not found in config"
    fi
    echo ""
done

echo "✅ STEP 3: PR Status Summary..."
echo "GitHub PR Links:"
for i in "${!websites[@]}"; do
    pr_num=$((14500 + i))
    if [ "${websites[$i]}" = "byjus" ]; then
        pr_num=14509
    elif [ "${websites[$i]}" = "flipkart" ]; then
        pr_num=14508
    elif [ "${websites[$i]}" = "indianexpress" ]; then
        pr_num=14507
    elif [ "${websites[$i]}" = "myntra" ]; then
        pr_num=14506
    elif [ "${websites[$i]}" = "ndtv" ]; then
        pr_num=14511
    elif [ "${websites[$i]}" = "paytm" ]; then
        pr_num=14502
    elif [ "${websites[$i]}" = "phonepe" ]; then
        pr_num=14503
    elif [ "${websites[$i]}" = "swiggy" ]; then
        pr_num=14500
    elif [ "${websites[$i]}" = "thehindu" ]; then
        pr_num=14504
    elif [ "${websites[$i]}" = "unacademy" ]; then
        pr_num=14501
    elif [ "${websites[$i]}" = "vedantu" ]; then
        pr_num=14510
    elif [ "${websites[$i]}" = "zomato" ]; then
        pr_num=14505
    fi
    echo "  ${websites[$i]}.com: https://github.com/darkreader/darkreader/pull/${pr_num}"
done

echo ""
echo "🎯 VERIFICATION COMPLETE!"
echo "If all checks show ✓, your PRs are ready for review!"
