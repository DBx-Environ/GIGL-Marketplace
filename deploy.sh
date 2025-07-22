#!/bin/bash

# GIGL Marketplace - GitHub Update and Deploy Script
# Run this from your local repository root: C:/Users/david/bidding-app

echo "🚀 GIGL Marketplace - GitHub Update and Deploy"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
    print_error "Not in the correct directory. Please run from C:/Users/david/bidding-app"
    exit 1
fi

print_status "Current directory: $(pwd)"

# Check git status
print_status "Checking git status..."
git status

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes. Showing status:"
    git status --short
    
    echo ""
    read -p "Do you want to continue and commit all changes? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Aborting. Please commit your changes manually first."
        exit 1
    fi
    
    # Add all changes
    print_status "Adding all changes to git..."
    git add .
    
    # Get commit message from user
    echo ""
    read -p "Enter commit message (or press Enter for default): " commit_message
    
    if [ -z "$commit_message" ]; then
        commit_message="Production ready: All lint fixes complete, ready for deployment"
    fi
    
    # Commit changes
    print_status "Committing changes..."
    git commit -m "$commit_message"
    
    if [ $? -eq 0 ]; then
        print_success "Changes committed successfully"
    else
        print_error "Failed to commit changes"
        exit 1
    fi
else
    print_success "Working directory is clean"
fi

# Check current branch
current_branch=$(git branch --show-current)
print_status "Current branch: $current_branch"

# Ensure we're on main branch
if [ "$current_branch" != "main" ]; then
    print_warning "Not on main branch. Switching to main..."
    git checkout main
    
    if [ $? -ne 0 ]; then
        print_error "Failed to switch to main branch"
        exit 1
    fi
    
    print_success "Switched to main branch"
fi

# Pull latest changes from remote
print_status "Pulling latest changes from remote..."
git pull origin main

if [ $? -ne 0 ]; then
    print_error "Failed to pull from remote. Please resolve conflicts manually."
    exit 1
fi

# Run a quick build test
print_status "Running build test..."
npm run build > build_test.log 2>&1

if [ $? -eq 0 ]; then
    print_success "Build test passed"
    rm build_test.log
else
    print_error "Build test failed. Check build_test.log for details"
    echo "Last 10 lines of build log:"
    tail -10 build_test.log
    exit 1
fi

# Run lint check for functions
print_status "Running function lint check..."
cd functions
npm run lint > ../functions_lint.log 2>&1
lint_exit_code=$?
cd ..

if [ $lint_exit_code -eq 0 ]; then
    print_success "Function lint check passed"
    rm functions_lint.log
else
    print_warning "Function lint check has warnings/errors. Check functions_lint.log"
    echo "Last 10 lines of lint log:"
    tail -10 functions_lint.log
    
    echo ""
    read -p "Continue with deployment despite lint issues? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Aborting due to lint issues"
        exit 1
    fi
fi

# Push to GitHub
print_status "Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    print_success "Successfully pushed to GitHub!"
else
    print_error "Failed to push to GitHub"
    exit 1
fi

# Check if .github/workflows exists for GitHub Actions
if [ -d ".github/workflows" ]; then
    print_success "GitHub Actions workflows detected"
    print_status "Automatic deployment should start shortly..."
    print_status "Monitor deployment at: https://github.com/DBx-Environ/GIGL-Marketplace/actions"
else
    print_warning "No GitHub Actions workflows found"
    print_status "You may need to deploy manually using: firebase deploy"
fi

# Final status
echo ""
echo "=============================================="
print_success "GitHub update completed successfully!"
echo ""
print_status "Next steps:"
echo "  1. Monitor GitHub Actions: https://github.com/DBx-Environ/GIGL-Marketplace/actions"
echo "  2. Check deployment status on Firebase Console"
echo "  3. Test the live application: https://gigl-marketplace-v3.web.app"
echo ""
print_status "Manual deployment commands (if needed):"
echo "  firebase deploy --only hosting    # Deploy React app only"
echo "  firebase deploy --only functions  # Deploy functions only" 
echo "  firebase deploy                   # Deploy everything"
echo ""
echo "🎉 Ready for production!"