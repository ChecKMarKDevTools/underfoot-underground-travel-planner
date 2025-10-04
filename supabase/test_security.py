#!/usr/bin/env python3
"""Test Supabase RLS security policies"""

import os
import sys
import time
import requests
from datetime import datetime, timedelta

PROJECT_URL = "https://uqvwaiexsgprdbdecoxx.supabase.co"
ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdndhaWV4c2dwcmRiZGVjb3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTQ4NjcsImV4cCI6MjA3MjEzMDg2N30.Udcrl-hf4A-Hwf-6Yn1vLkcsvudXWCjEoAgq4N2iP8s")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdndhaWV4c2dwcmRiZGVjb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU1NDg2NywiZXhwIjoyMDcyMTMwODY3fQ.ge77JtO_vPUmXnQ8mz06w4VoryibGPyjfpiG4ejZieI")

def test_read(key, key_name):
    """Test read access"""
    response = requests.get(
        f"{PROJECT_URL}/rest/v1/search_results?limit=1",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}"
        }
    )
    return response.status_code

def test_insert(key):
    """Test insert with valid data"""
    test_hash = f"test_{int(time.time())}"
    expires_at = (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z"
    
    response = requests.post(
        f"{PROJECT_URL}/rest/v1/search_results",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        json={
            "query_hash": test_hash,
            "location": "Test Location",
            "intent": "test query",
            "results_json": [],
            "expires_at": expires_at
        }
    )
    return response.status_code, test_hash

def test_delete(key, query_hash):
    """Test delete access"""
    response = requests.delete(
        f"{PROJECT_URL}/rest/v1/search_results?query_hash=eq.{query_hash}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}"
        }
    )
    return response.status_code

def main():
    print("🧪 Testing Supabase RLS Security...\n")
    
    # Wait for PostgREST to reload
    print("⏳ Waiting for PostgREST schema reload...")
    for i in range(20):
        try:
            status = test_read(ANON_KEY, "anon")
            if status == 200:
                print("✅ Schema loaded!\n")
                break
            elif status >= 500:
                print(f"  Attempt {i+1}/20 - Still loading...")
                time.sleep(3)
            else:
                print(f"  Unexpected status: {status}")
                break
        except Exception as e:
            print(f"  Error: {e}")
            time.sleep(3)
    
    # Test 1: Read with anon key
    print("Test 1: Reading cache with anon key (should succeed)...")
    status = test_read(ANON_KEY, "anon")
    if status == 200:
        print("✅ PASS: Anon read works\n")
    else:
        print(f"❌ FAIL: Anon read failed (HTTP {status})\n")
    
    # Test 2: Insert with anon key
    print("Test 2: Inserting cache with anon key (should succeed)...")
    status, test_hash = test_insert(ANON_KEY)
    if status == 201:
        print(f"✅ PASS: Anon insert works\n")
    else:
        print(f"❌ FAIL: Anon insert failed (HTTP {status})\n")
        test_hash = "fallback_test"
    
    # Test 3: Delete with anon key (should FAIL)
    print("Test 3: Deleting cache with anon key (should FAIL - RLS blocks this)...")
    status = test_delete(ANON_KEY, test_hash)
    if status in [401, 403]:
        print(f"✅ PASS: Anon delete blocked (HTTP {status}) - Security working!\n")
    else:
        print(f"⚠️  WARNING: Anon delete returned HTTP {status} (expected 401/403)\n")
    
    # Test 4: Delete with service role key (should work)
    print("Test 4: Deleting cache with service role key (should succeed)...")
    status = test_delete(SERVICE_KEY, test_hash)
    if status in [200, 204]:
        print(f"✅ PASS: Service role delete works\n")
    else:
        print(f"❌ FAIL: Service role delete failed (HTTP {status})\n")
    
    print("🎉 Security test complete!")

if __name__ == "__main__":
    main()
