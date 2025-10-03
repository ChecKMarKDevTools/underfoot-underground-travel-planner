#!/bin/bash
set -e

echo "🔐 Deploying secure Supabase migrations..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project details
PROJECT_ID="uqvwaiexsgprdbdecoxx"
PROJECT_URL="https://uqvwaiexsgprdbdecoxx.supabase.co"

echo -e "${YELLOW}Step 1: Authentication${NC}"
echo "Logging into Supabase..."
npx supabase login

echo ""
echo -e "${YELLOW}Step 2: Link Project${NC}"
echo "Linking to project: $PROJECT_ID"
npx supabase link --project-ref $PROJECT_ID

echo ""
echo -e "${YELLOW}Step 3: Check Current Database State${NC}"
npx supabase db diff --schema public

echo ""
read -p "Do you want to push migrations? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${YELLOW}Step 4: Push Migrations${NC}"
    echo "Pushing secure RLS policies and schema..."
    npx supabase db push
    
    echo ""
    echo -e "${GREEN}✅ Migrations pushed successfully!${NC}"
    
    echo ""
    echo -e "${YELLOW}Step 5: Deploy Edge Function${NC}"
    read -p "Deploy merge-cache edge function? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        npx supabase functions deploy merge-cache --no-verify-jwt
        echo -e "${GREEN}✅ Edge function deployed!${NC}"
    fi
else
    echo -e "${RED}❌ Migration push cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update your .env file with these values:"
echo "   SUPABASE_URL=$PROJECT_URL"
echo "   SUPABASE_ANON_KEY=<your-anon-key>"
echo "   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
echo ""
echo "2. Test the security (see supabase/README.md)"
echo "3. Restart your backend server"
