#!/bin/bash

# gitpush.sh
# 
# Purpose: A utility script that handles GitHub authentication, repository creation, and code pushing.
# This script ensures the user is logged in as A19grey, creates a repository if it doesn't exist,
# and pushes code with a commit message.
#
# Usage examples:
#   ./gitpush.sh "Initial commit" --name my-new-repo
#   ./gitpush.sh "Updated README" --name existing-repo
#
# Author: A19grey
# Email: A19grey@gmail.com

# Function to display usage information
usage() {
    echo "Usage: $0 \"commit message\" --name repo-name"
    echo "  commit message: The message for your git commit"
    echo "  --name: The name of the GitHub repository (will be created if it doesn't exist)"
    exit 1
}

# Function to check if GitHub CLI is installed
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        echo "Error: GitHub CLI is not installed."
        echo "Please install it from https://cli.github.com/"
        exit 1
    fi
}

# Function to convert string to lowercase
to_lowercase() {
    echo "$1" | tr '[:upper:]' '[:lower:]'
}

# Function to check GitHub authentication
check_auth() {
    # Check if user is logged in
    if ! gh auth status &> /dev/null; then
        echo "Not logged in to GitHub. Attempting to login..."
        
        # Try to authenticate using the token if available
        if [ -n "$GIT_REPLIT_PERSONAL_TOKEN" ]; then
            echo "Authenticating with GitHub token..."
            echo "$GIT_REPLIT_PERSONAL_TOKEN" | gh auth login --with-token
        else
            echo "Error: GIT_REPLIT_PERSONAL_TOKEN environment variable not set."
            echo "Please set it or login manually using 'gh auth login'"
            exit 1
        fi
    fi
    
    # Verify the logged-in user is A19grey with the correct email
    USER_INFO=$(gh api user)
    CURRENT_USER=$(echo "$USER_INFO" | grep -o '"login": *"[^"]*"' | cut -d'"' -f4)
    
    # Case-insensitive comparison for username using our custom function
    CURRENT_USER_LOWER=$(to_lowercase "$CURRENT_USER")
    if [ "$CURRENT_USER_LOWER" != "a19grey" ]; then
        echo "Error: You are logged in as $CURRENT_USER, not A19grey."
        echo "Please logout using 'gh auth logout' and login as A19grey."
        
        # Force logout and prompt for new login
        echo "Logging out current user..."
        gh auth logout -h github.com
        
        echo "Please login as A19grey:"
        if [ -n "$GIT_REPLIT_PERSONAL_TOKEN" ]; then
            echo "Authenticating with GitHub token..."
            echo "$GIT_REPLIT_PERSONAL_TOKEN" | gh auth login --with-token
        else
            gh auth login
        fi
        
        # Verify again after re-login
        USER_INFO=$(gh api user)
        CURRENT_USER=$(echo "$USER_INFO" | grep -o '"login": *"[^"]*"' | cut -d'"' -f4)
        CURRENT_USER_LOWER=$(to_lowercase "$CURRENT_USER")
        if [ "$CURRENT_USER_LOWER" != "a19grey" ]; then
            echo "Error: Still not logged in as A19grey. Exiting."
            exit 1
        fi
    fi
    
    # Check git config for email
    GIT_EMAIL=$(git config --get user.email)
    if [ "$GIT_EMAIL" != "A19grey@gmail.com" ]; then
        echo "Setting git email to A19grey@gmail.com..."
        git config --global user.email "A19grey@gmail.com"
    fi
    
    # Check git config for name
    GIT_NAME=$(git config --get user.name)
    if [ "$GIT_NAME" != "A19grey" ]; then
        echo "Setting git name to A19grey..."
        git config --global user.name "A19grey"
    fi
    
    # Configure git to use HTTPS with token authentication
    if [ -n "$GIT_REPLIT_PERSONAL_TOKEN" ]; then
        echo "Configuring git to use token authentication..."
        git config --global credential.helper store
        echo "https://A19grey:${GIT_REPLIT_PERSONAL_TOKEN}@github.com" > ~/.git-credentials
        chmod 600 ~/.git-credentials
        
        # Increase buffer size for large pushes
        git config --global http.postBuffer 524288000
        git config --global http.maxRequestBuffer 100M
        git config --global core.compression 9
    fi
    
    echo "Authenticated as A19grey (A19grey@gmail.com)"
}

# Function to check if repository exists and create it if it doesn't
check_and_create_repo() {
    local repo_name=$1
    
    # Check if repo exists
    if ! gh repo view "A19grey/$repo_name" &> /dev/null; then
        echo "Repository $repo_name does not exist. Creating it..."
        gh repo create "$repo_name" --public --confirm
        
        # Initialize git if not already initialized
        if [ ! -d .git ]; then
            git init
        fi
        
        # Add remote if not already set
        if ! git remote get-url origin &> /dev/null; then
            git remote add origin "https://github.com/A19grey/$repo_name.git"
        elif [ "$(git remote get-url origin)" != "https://github.com/A19grey/$repo_name.git" ]; then
            git remote set-url origin "https://github.com/A19grey/$repo_name.git"
        fi
    else
        echo "Repository $repo_name already exists."
        
        # Initialize git if not already initialized
        if [ ! -d .git ]; then
            git init
            git remote add origin "https://github.com/A19grey/$repo_name.git"
        elif ! git remote get-url origin &> /dev/null; then
            git remote add origin "https://github.com/A19grey/$repo_name.git"
        elif [ "$(git remote get-url origin)" != "https://github.com/A19grey/$repo_name.git" ]; then
            git remote set-url origin "https://github.com/A19grey/$repo_name.git"
        fi
    fi
}

# Function to check for node_modules and ensure .gitignore is properly set up
check_node_modules() {
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        echo "node_modules directory found. Ensuring it's in .gitignore..."
        
        # Create .gitignore if it doesn't exist
        if [ ! -f ".gitignore" ]; then
            echo "Creating .gitignore file..."
            cat > .gitignore << EOL
# Dependencies
node_modules/
npm-debug.log
yarn-debug.log
yarn-error.log
package-lock.json
yarn.lock

# Build outputs
dist/
build/
out/
.next/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE and editor files
.idea/
.vscode/
*.swp
*.swo
.DS_Store

# Logs
logs/
*.log

# Testing
coverage/

# Misc
.cache/
.tmp/
EOL
        else
            # Check if node_modules is already in .gitignore
            if ! grep -q "node_modules" .gitignore; then
                echo "Adding node_modules to .gitignore..."
                echo "# Dependencies" >> .gitignore
                echo "node_modules/" >> .gitignore
            fi
        fi
        
        # If node_modules is already staged, unstage it
        if git ls-files --stage | grep -q "node_modules"; then
            echo "Unstaging node_modules directory..."
            git rm -r --cached node_modules/
        fi
        
        echo "node_modules is now properly excluded from git."
    fi
}

# Function to commit and push changes
commit_and_push() {
    local commit_message=$1
    local repo_name=$2
    
    # Check for node_modules and ensure it's ignored
    check_node_modules
    
    # Show what will be staged
    echo "Files to be staged:"
    git status
    
    # Add all files
    echo "Staging all changes..."
    git add .
    
    # Show what's been staged
    echo "Staged files:"
    git status --short
    
    # Commit with the provided message
    echo "Committing changes with message: '$commit_message'"
    git commit -m "$commit_message"
    
    # Try to push in smaller chunks if the repository is large
    echo "Pushing to repository..."
    
    # Set the push URL with token authentication if available
    if [ -n "$GIT_REPLIT_PERSONAL_TOKEN" ]; then
        PUSH_URL="https://A19grey:${GIT_REPLIT_PERSONAL_TOKEN}@github.com/A19grey/${repo_name}.git"
    else
        PUSH_URL="origin"
    fi
    
    # Try to determine the current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ -z "$CURRENT_BRANCH" ] || [ "$CURRENT_BRANCH" = "HEAD" ]; then
        CURRENT_BRANCH="main"
    fi
    
    echo "Pushing to branch: $CURRENT_BRANCH"
    
    # Try pushing with different strategies
    if ! git push -u "$PUSH_URL" "$CURRENT_BRANCH"; then
        echo "Initial push failed. Trying alternative methods..."
        
        # Try pushing with the --force flag
        if ! git push -u "$PUSH_URL" "$CURRENT_BRANCH" --force; then
            echo "Force push failed. Trying to push in smaller chunks..."
            
            # Try pushing with depth limitation
            if ! git push -u "$PUSH_URL" "$CURRENT_BRANCH" --force --no-verify; then
                echo "All push attempts failed. Please check your repository size and network connection."
                echo "You may need to push manually or in smaller commits."
                exit 1
            fi
        fi
    fi
    
    echo "Push successful!"
}

# Main script execution starts here

# Check if GitHub CLI is installed
check_gh_cli

# Parse command line arguments
if [ $# -lt 3 ]; then
    usage
fi

COMMIT_MESSAGE=$1
shift

while [ $# -gt 0 ]; do
    case "$1" in
        --name)
            REPO_NAME=$2
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate required parameters
if [ -z "$COMMIT_MESSAGE" ] || [ -z "$REPO_NAME" ]; then
    echo "Error: Both commit message and repository name are required."
    usage
fi

# Check authentication and ensure correct user
check_auth

# Check if repository exists and create it if needed
check_and_create_repo "$REPO_NAME"

# Commit and push changes
commit_and_push "$COMMIT_MESSAGE" "$REPO_NAME"

echo "Successfully pushed to https://github.com/A19grey/$REPO_NAME" 