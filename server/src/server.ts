import express from "express";
import cors from "cors";
import { supabase } from "./config/db";
import { RegisterDTO, AuthResponse } from "@zno/shared";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json("Server is working");
});

app.get("/test-db", async (req, res) => {
  const { data, error } = await supabase.from("profiles").select("*").limit(1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.json({ message: "Зв'язок з Supabase встановлено!", data });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, username }: RegisterDTO = req.body;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) return res.status(400).json({error: authError.message});

  if (authData.user) {
    const {error: profileError} = await supabase
      .from('profiles')
      .insert([{ id: authData.user.id, username, email }]);
    
    if (profileError) return res.status(400).json({error: profileError.message});
  }

  const response: AuthResponse = {
    user: {
      id: authData.user?.id || '',
      email: email,
      username: username,
      role: 'student',
      createdAt: new Date().toISOString()
    },
    token: authData.session?.access_token || ''
  };

  res.status(201).json(response);
});

app.listen(5002, () => {
  console.log("Server running on port 5002");
});