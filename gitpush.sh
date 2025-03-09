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
# Author: a19grey
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
    
    if [ "$CURRENT_USER" != "a19grey" ]; then
        echo "Error: You are logged in as $CURRENT_USER, not A19grey."
        echo "Please logout and login as a19grey."
        exit 1
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

# Function to commit and push changes
commit_and_push() {
    local commit_message=$1
    
    # Add all files
    git add .
    
    # Commit with the provided message
    git commit -m "$commit_message"
    
    # Push to the remote repository
    git push -u origin main || git push -u origin master
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
commit_and_push "$COMMIT_MESSAGE"

echo "Successfully pushed to https://github.com/A19grey/$REPO_NAME" 