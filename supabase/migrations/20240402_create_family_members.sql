-- Tabela para gerenciar membros da família
CREATE TABLE IF NOT EXISTS membros_familia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dono_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    convidado_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- ID do usuário no Supabase Auth após aceitar
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'ativo'
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dono_id, email)
);

-- Habilitar RLS
ALTER TABLE membros_familia ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Donos podem ver seus membros" ON membros_familia
    FOR SELECT USING (auth.uid() = dono_id);

CREATE POLICY "Donos podem adicionar membros" ON membros_familia
    FOR INSERT WITH CHECK (auth.uid() = dono_id);

CREATE POLICY "Donos podem atualizar seus membros" ON membros_familia
    FOR UPDATE USING (auth.uid() = dono_id);

CREATE POLICY "Donos podem deletar seus membros" ON membros_familia
    FOR DELETE USING (auth.uid() = dono_id);

-- Política para o convidado ver seu próprio registro
CREATE POLICY "Convidados podem ver seu convite" ON membros_familia
    FOR SELECT USING (auth.uid() = convidado_id);

-- Função para contar membros (opcional, mas útil para validação no banco)
CREATE OR REPLACE FUNCTION check_family_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_limit INTEGER;
    v_count INTEGER;
    v_plano TEXT;
    v_membros_extras INTEGER;
BEGIN
    -- Buscar plano do dono
    SELECT plano, membros_extras INTO v_plano, v_membros_extras 
    FROM assinaturas 
    WHERE id = NEW.dono_id;

    -- Definir limite
    v_limit := 0;
    IF v_plano ILIKE '%famil%' THEN
        v_limit := 3;
    END IF;

    IF v_membros_extras > 0 THEN
        v_limit := v_limit + 3;
    END IF;

    -- Contar membros atuais
    SELECT COUNT(*) INTO v_count FROM membros_familia WHERE dono_id = NEW.dono_id;

    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'Limite de membros da família atingido (% membros)', v_limit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_family_limit
BEFORE INSERT ON membros_familia
FOR EACH ROW EXECUTE FUNCTION check_family_limit();
