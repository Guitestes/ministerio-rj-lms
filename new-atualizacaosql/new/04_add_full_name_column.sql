-- Adicionar coluna full_name à tabela profiles para compatibilidade
-- Este script resolve o erro: column p.full_name does not exist

-- Adicionar a coluna full_name se ela não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Atualizar a coluna full_name com os valores da coluna name existente
UPDATE public.profiles 
SET full_name = name 
WHERE full_name IS NULL AND name IS NOT NULL;

-- Criar um trigger para manter full_name sincronizado com name
CREATE OR REPLACE FUNCTION sync_full_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Se name foi atualizado, sincronizar com full_name
    IF NEW.name IS DISTINCT FROM OLD.name THEN
        NEW.full_name = NEW.name;
    END IF;
    
    -- Se full_name foi atualizado, sincronizar com name
    IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
        NEW.name = NEW.full_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger
DROP TRIGGER IF EXISTS sync_full_name_trigger ON public.profiles;
CREATE TRIGGER sync_full_name_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_full_name();

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.full_name IS 'Nome completo do usuário - mantido sincronizado com a coluna name';
COMMENT ON FUNCTION sync_full_name() IS 'Função para manter as colunas name e full_name sincronizadas';