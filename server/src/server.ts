import express from "express";
import cors from "cors";
import { supabase } from "./config/db";

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

app.listen(5002, () => {
  console.log("Server running on port 5002");
});