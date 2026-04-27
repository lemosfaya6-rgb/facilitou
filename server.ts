import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG SUPABASE NO SERVIDOR (Muito mais estável e rápido para bypassar blocks locais)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mwyssozviszlgsvruggj.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13eXNzb3p2aXN6bGdzdnJ1Z2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mzc5MjcsImV4cCI6MjA5MjUxMzkyN30.Fqa3R0fiVtqyTqFFIJj8F19r-59fPPHJ1Z2E3toGhnU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(cors());
  app.use(cookieParser());

  // Logging Middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  const DATA_DIR = path.join(__dirname, "data");
  const COLLECTIONS = ["users", "profiles", "services", "messages"];

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    for (const collection of COLLECTIONS) {
      const filePath = path.join(DATA_DIR, `${collection}.json`);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, JSON.stringify([]));
      }
    }
  } catch (err) {
    console.error("Error creating data directory:", err);
  }

  // --- PROXY AUTH ---
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return res.status(error.status || 401).json({ message: error.message });

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single();

      res.json({ user: data.user, session: data.session, profile });
    } catch (err: any) {
      res.status(500).json({ message: "Servidor indisponível" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: name } }
      });
      if (error) return res.status(error.status || 400).json({ message: error.message });
      res.status(201).json({ user: data.user });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // --- PROXY DATA: PROFILES ---
  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      const profiles = JSON.parse(await fs.readFile(path.join(DATA_DIR, "profiles.json"), "utf-8"));
      const profile = profiles.find((p: any) => p.id === req.params.id);
      if (profile) return res.json(profile);
      res.status(404).json({ message: "Perfil não encontrado" });
    }
  });

  app.put("/api/profiles/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) {
      const profiles = JSON.parse(await fs.readFile(path.join(DATA_DIR, "profiles.json"), "utf-8"));
      const index = profiles.findIndex((p: any) => p.id === req.params.id);
      const updated = { ...req.body, id: req.params.id };
      if (index !== -1) {
        profiles[index] = { ...profiles[index], ...updated };
      } else {
        profiles.push(updated);
      }
      await fs.writeFile(path.join(DATA_DIR, "profiles.json"), JSON.stringify(profiles));
      res.json(updated);
    }
  });

  // --- PROXY DATA ---
  app.get("/api/services", async (req, res) => {
    try {
      const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (err) {
      const services = JSON.parse(await fs.readFile(path.join(DATA_DIR, "services.json"), "utf-8"));
      res.json(services);
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const { data, error } = await supabase.from('services').insert(req.body).select().single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      const services = JSON.parse(await fs.readFile(path.join(DATA_DIR, "services.json"), "utf-8"));
      const newS = { ...req.body, id: uuidv4(), created_at: new Date().toISOString() };
      services.push(newS);
      await fs.writeFile(path.join(DATA_DIR, "services.json"), JSON.stringify(services));
      res.status(201).json(newS);
    }
  });

  app.get("/api/messages/:userId", async (req, res) => {
    try {
      console.log(`Fetching messages for user: ${req.params.userId}`);
      const { data, error } = await supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${req.params.userId},receiver_id.eq.${req.params.userId}`);
      
      if (error) {
        console.warn("Supabase messages fetch failed, falling back to local:", error.message);
        throw error;
      }
      res.json(data || []);
    } catch (err) {
      try {
        const filePath = path.join(DATA_DIR, "messages.json");
        const fileData = await fs.readFile(filePath, "utf-8");
        const messages = JSON.parse(fileData || "[]");
        res.json(messages.filter((m: any) => m.sender_id === req.params.userId || m.receiver_id === req.params.userId));
      } catch (fallbackErr) {
        console.error("Local fallback failed:", fallbackErr);
        res.json([]); // Return empty list instead of crashing
      }
    }
  });

  app.get("/api/messages/chat/:userId/:otherId", async (req, res) => {
    try {
      console.log(`Fetching chat between ${req.params.userId} and ${req.params.otherId}`);
      const { data, error } = await supabase.from('messages')
        .select('*')
        .or(`and(sender_id.eq.${req.params.userId},receiver_id.eq.${req.params.otherId}),and(sender_id.eq.${req.params.otherId},receiver_id.eq.${req.params.userId})`);
      
      if (error) {
        console.warn("Supabase chat fetch failed, falling back to local:", error.message);
        throw error;
      }
      res.json(data || []);
    } catch (err) {
      try {
        const filePath = path.join(DATA_DIR, "messages.json");
        const fileData = await fs.readFile(filePath, "utf-8");
        const messages = JSON.parse(fileData || "[]");
        res.json(messages.filter((m: any) => 
          (m.sender_id === req.params.userId && m.receiver_id === req.params.otherId) ||
          (m.sender_id === req.params.otherId && m.receiver_id === req.params.userId)
        ));
      } catch (fallbackErr) {
        console.error("Local fallback failed:", fallbackErr);
        res.json([]);
      }
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { data, error } = await supabase.from('messages').insert(req.body).select().single();
      if (error) {
        console.warn("Supabase message send failed, falling back to local:", error.message);
        throw error;
      }
      res.status(201).json(data);
    } catch (err) {
      try {
        const filePath = path.join(DATA_DIR, "messages.json");
        const fileData = await fs.readFile(filePath, "utf-8");
        const messages = JSON.parse(fileData || "[]");
        const newM = { ...req.body, id: uuidv4(), timestamp: new Date().toISOString() };
        messages.push(newM);
        await fs.writeFile(filePath, JSON.stringify(messages));
        res.status(201).json(newM);
      } catch (fallbackErr) {
        console.error("Local fallback post failed:", fallbackErr);
        res.status(500).json({ message: "Erro ao salvar mensagem localmente" });
      }
    }
  });

  // VITE
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Facilitou Server Proxima running on port ${PORT}`);
  });
}

startServer();
