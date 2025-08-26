-- Script para corrigir função duplicada get_quantitative_summary
-- Execute este script antes de executar o 02_reports_functions.sql

-- Remove a função duplicada do esquema reports
DROP FUNCTION IF EXISTS reports.get_quantitative_summary(DATE, DATE, TEXT, TEXT);

-- Remove o esquema reports se estiver vazio
DROP SCHEMA IF EXISTS reports CASCADE;

-- Comentário: Após executar este script, você pode executar o 02_reports_functions.sql sem erro