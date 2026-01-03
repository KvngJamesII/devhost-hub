-- Add entry_point column to panels table for custom startup file configuration
ALTER TABLE public.panels 
ADD COLUMN entry_point text DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN public.panels.entry_point IS 'Custom entry point file for the panel (e.g., app.py, index.js, main.py, server.js)';