import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xowlyzstzctcbsbnyxtm.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '...'; // I will get it from .env

async function test() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "test@example.com",
    password: "password123"
  });

  if (error) {
    console.log("Login error:", error);
    // Let's create a user if not exists
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: "test@example.com",
      password: "password123"
    });
    console.log("Signup:", signUpError ? signUpError : "Success");
    return;
  }

  const token = data.session.access_token;
  console.log("Got token.");

  const res = await fetch('http://localhost:3000/api/matches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      receiverId: "mock-es-01",
      type: "LIKE",
      forceMatch: true
    })
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test();
