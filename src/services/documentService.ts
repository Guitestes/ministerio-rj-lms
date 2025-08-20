import { supabase } from '@/integrations/supabase/client';
import { CourseDocument, GeneralDocument, CourseMedia } from '@/types';
import { 
  STORAGE_BUCKETS,
  uploadFile, 
  deleteFile 
} from '@/utils/storage';

// Funções auxiliares
const generateFilePath = (folder: string, fileName: string): string => {
  const timestamp = Date.now();
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${folder}/${timestamp}_${cleanFileName}`;
};

const uploadDocument = async (filePath: string, file: File, bucket: string = STORAGE_BUCKETS.DOCUMENTOS): Promise<string> => {
  return await uploadFile(bucket, filePath, file);
};

const deleteDocument = async (filePath: string, bucket: string = STORAGE_BUCKETS.DOCUMENTOS): Promise<void> => {
  await deleteFile(bucket, filePath);
};

const extractFilePathFromUrl = (url: string): string => {
  // Extrai o caminho do arquivo da URL pública do Supabase
  const urlParts = url.split('/');
  const bucketIndex = urlParts.findIndex(part => part === 'object');
  if (bucketIndex !== -1 && bucketIndex + 2 < urlParts.length) {
    return urlParts.slice(bucketIndex + 2).join('/');
  }
  return '';
};

// ===== Serviço de Documentos do Curso =====

export const documentService = {
  /**
   * Busca todos os documentos associados a um curso.
   * @param courseId - O ID do curso.
   * @returns Uma lista de documentos do curso.
   */
  async getDocumentsByCourse(courseId: string): Promise<CourseDocument[]> {
    if (!courseId) throw new Error('ID do curso é obrigatório');

    const { data, error } = await supabase
      .from('course_documents')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar documentos do curso:', error);
      throw new Error('Falha ao buscar documentos do curso.');
    }

    return data.map(doc => ({
        id: doc.id,
        courseId: doc.course_id,
        documentName: doc.document_name,
        documentUrl: doc.document_url,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        bucketPath: doc.bucket_path,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
    }));
  },

  /**
   * Faz upload de um novo documento para um curso.
   * @param courseId - O ID do curso.
   * @param file - O arquivo a ser enviado.
   * @returns O objeto do documento do curso criado.
   */
  async uploadCourseDocument(courseId: string, file: File): Promise<CourseDocument> {
    if (!courseId || !file) throw new Error('ID do curso e arquivo são obrigatórios');

    const filePath = generateFilePath(`course-documents/${courseId}`, file.name);
    const publicUrl = await uploadDocument(filePath, file);

    const { data, error } = await supabase
      .from('course_documents')
      .insert({
        course_id: courseId,
        document_name: file.name,
        document_url: publicUrl,
        bucket_path: filePath,
        file_size: file.size,
        file_type: file.type
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao salvar documento do curso:', error);
      // Tentar deletar o arquivo órfão
      await deleteDocument(filePath);
      throw new Error('Falha ao salvar informações do documento.');
    }

    return {
        id: data.id,
        courseId: data.course_id,
        documentName: data.document_name,
        documentUrl: data.document_url,
        fileType: data.file_type,
        fileSize: data.file_size,
        bucketPath: data.bucket_path,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
  },

  /**
   * Deleta um documento de um curso.
   * @param documentId - O ID do documento a ser deletado.
   */
  async deleteCourseDocument(documentId: string): Promise<void> {
    if (!documentId) throw new Error('ID do documento é obrigatório');

    // 1. Buscar o documento para obter o caminho do arquivo
    const { data: doc, error: fetchError } = await supabase
        .from('course_documents')
        .select('document_url, bucket_path')
        .eq('id', documentId)
        .single();

    if (fetchError || !doc) {
        console.error('Erro ao buscar documento para exclusão:', fetchError);
        throw new Error('Documento não encontrado.');
    }

    // 2. Deletar o registro do banco de dados
    const { error: deleteDbError } = await supabase
        .from('course_documents')
        .delete()
        .eq('id', documentId);

    if (deleteDbError) {
        console.error('Erro ao deletar registro do documento:', deleteDbError);
        throw new Error('Falha ao deletar o documento.');
    }

    // 3. Deletar o arquivo do storage
    try {
        if (doc.bucket_path) {
            // Arquivo novo usando o bucket 'documentos'
            await deleteDocument(doc.bucket_path);
        } else {
            // Arquivo antigo usando o bucket 'course-files' (compatibilidade)
            const url = new URL(doc.document_url);
            const filePath = url.pathname.split('/course-files/')[1];
            await deleteFile('course-files', filePath);
        }
    } catch (e) {
        console.error("Erro ao deletar arquivo do storage:", e);
    }
  },

  // ===== Serviço de Documentos Gerais =====

  /**
   * Busca documentos gerais com base em filtros.
   * @param params - Parâmetros de filtro, ordenação e status.
   * @returns Uma lista de documentos gerais.
   */
  async getGeneralDocuments(params?: {
    category?: string;
    sortBy?: 'created_at' | 'title';
    status?: 'active' | 'archived';
  }): Promise<GeneralDocument[]> {
    let query = supabase.from('general_documents').select('*');

    // Filtra por status, padrão é 'active'
    query = query.eq('status', params?.status || 'active');

    if (params?.category) {
      query = query.eq('category', params.category);
    }

    if (params?.sortBy) {
      query = query.order(params.sortBy, { ascending: params.sortBy === 'title' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar documentos gerais:', error);
      throw new Error('Falha ao buscar documentos gerais.');
    }

    return data.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        documentUrl: doc.document_url,
        documentType: doc.document_type,
        category: doc.category,
        fileSize: doc.file_size,
        status: doc.status,
        createdBy: doc.created_by,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
    }));
  },

  /**
   * Atualiza os metadados de um documento geral.
   * @param documentId - O ID do documento a ser atualizado.
   * @param metadata - Os novos metadados do documento.
   * @returns O objeto do documento geral atualizado.
   */
  async updateGeneralDocument(documentId: string, metadata: { title?: string; description?: string; category?: string }): Promise<GeneralDocument> {
    if (!documentId) throw new Error('ID do documento é obrigatório');

    const { data, error } = await supabase
      .from('general_documents')
      .update(metadata)
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar documento geral:', error);
      throw new Error('Falha ao atualizar informações do documento.');
    }

    return {
        id: data.id,
        title: data.title,
        description: data.description,
        documentUrl: data.document_url,
        documentType: data.document_type,
        category: data.category,
        fileSize: data.file_size,
        status: data.status,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
  },

  /**
   * Altera o status de um documento geral (ex: arquivar/reativar).
   * @param documentId - O ID do documento.
   * @param status - O novo status ('active' or 'archived').
   */
  async setDocumentStatus(documentId: string, status: 'active' | 'archived'): Promise<void> {
    if (!documentId || !status) throw new Error('ID do documento e status são obrigatórios.');

    const { error } = await supabase
      .from('general_documents')
      .update({ status })
      .eq('id', documentId);

    if (error) {
      console.error(`Erro ao alterar status do documento para ${status}:`, error);
      throw new Error('Falha ao alterar o status do documento.');
    }
  },

  /**
   * Faz upload de um novo documento geral.
   * @param file - O arquivo a ser enviado.
   * @param metadata - Metadados do documento.
   * @returns O objeto do documento geral criado.
   */
  async uploadGeneralDocument(file: File, metadata: { title: string; description?: string; category?: string; }): Promise<GeneralDocument> {
    if (!file || !metadata.title) throw new Error('Arquivo e título são obrigatórios');

    const filePath = `general-documents/${Date.now()}_${file.name}`;
    // Corrigido para usar o bucket padronizado de documentos
    const publicUrl = await uploadDocument(filePath, file);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('general_documents')
      .insert({
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        document_url: publicUrl,
        document_type: file.type,
        file_size: file.size,
        bucket_path: filePath, // Adicionado para consistência
        created_by: user?.id,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao salvar documento geral:', error);
      // Tentar deletar o arquivo órfão do bucket correto
      await deleteDocument(filePath);
      throw new Error('Falha ao salvar informações do documento geral.');
    }

    return {
        id: data.id,
        title: data.title,
        description: data.description,
        documentUrl: data.document_url,
        documentType: data.document_type,
        category: data.category,
        fileSize: data.file_size,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
  },

  /**
   * Deleta um documento geral.
   * @param documentId - O ID do documento a ser deletado.
   */
  async deleteGeneralDocument(documentId: string): Promise<void> {
    if (!documentId) throw new Error('ID do documento é obrigatório');

    // 1. Buscar o documento para obter o caminho do arquivo
    const { data: doc, error: fetchError } = await supabase
        .from('general_documents')
        .select('document_url, bucket_path')
        .eq('id', documentId)
        .single();

    if (fetchError || !doc) {
        console.error('Erro ao buscar documento geral para exclusão:', fetchError);
        throw new Error('Documento geral não encontrado.');
    }

    // 2. Deletar o registro do banco de dados
    const { error: deleteDbError } = await supabase
        .from('general_documents')
        .delete()
        .eq('id', documentId);

    if (deleteDbError) {
        console.error('Erro ao deletar registro do documento geral:', deleteDbError);
        throw new Error('Falha ao deletar o documento geral.');
    }

    // 3. Deletar o arquivo do storage
    try {
      if (doc.bucket_path) {
        // Para documentos novos com bucket_path, usa o bucket padrão 'documentos'
        await deleteDocument(doc.bucket_path, STORAGE_BUCKETS.DOCUMENTOS);
      } else if (doc.document_url) {
        // Para documentos legados sem bucket_path, extrai o bucket e o caminho da URL
        const url = new URL(doc.document_url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.findIndex(part => part === 'public') + 1;

        if (bucketIndex > 0 && pathParts.length > bucketIndex + 1) {
          const bucketName = pathParts[bucketIndex];
          const filePath = pathParts.slice(bucketIndex + 1).join('/');

          if (bucketName && filePath) {
            console.log(`Deletando arquivo legado do bucket: ${bucketName}, path: ${filePath}`);
            await deleteFile(bucketName, filePath);
          } else {
            console.warn(`Não foi possível extrair bucket e caminho do arquivo para o documento ${documentId}. URL: ${doc.document_url}`);
          }
        } else {
          console.warn(`Formato de URL de storage inesperado para o documento ${documentId}: ${doc.document_url}`);
        }
      }
    } catch (e) {
      console.error(`Erro ao deletar arquivo do storage para o documento ${documentId}:`, e);
      // Não relançar o erro para não impedir a experiência do usuário se apenas a exclusão do arquivo falhar.
    }
  },

  // ===== Serviço de Mídias do Curso =====

  /**
   * Busca todas as mídias associadas a um curso.
   * @param courseId - O ID do curso.
   * @returns Uma lista de mídias do curso.
   */
  async getMediaByCourse(courseId: string): Promise<CourseMedia[]> {
    if (!courseId) throw new Error('ID do curso é obrigatório');

    const { data, error } = await supabase
      .from('course_media')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar mídias do curso:', error);
      throw new Error('Falha ao buscar mídias do curso.');
    }

    return data.map(media => ({
        id: media.id,
        courseId: media.course_id,
        mediaName: media.media_name,
        mediaUrl: media.media_url,
        mediaType: media.media_type,
        fileType: media.file_type,
        fileSize: media.file_size,
        bucketPath: media.bucket_path,
        thumbnailUrl: media.thumbnail_url,
        duration: media.duration,
        description: media.description,
        createdAt: media.created_at,
        updatedAt: media.updated_at,
    }));
  },

  /**
   * Faz upload de uma nova mídia para um curso.
   * @param courseId - O ID do curso.
   * @param file - O arquivo de mídia a ser enviado.
   * @param metadata - Metadados adicionais da mídia.
   * @returns O objeto da mídia do curso criada.
   */
  async uploadCourseMedia(courseId: string, file: File, metadata: {
    mediaType: 'video' | 'image' | 'audio' | 'other';
    description?: string;
    duration?: number;
  }): Promise<CourseMedia> {
    if (!courseId || !file) throw new Error('ID do curso e arquivo são obrigatórios');

    const filePath = generateFilePath(`course-media/${courseId}`, file.name);
    const publicUrl = await uploadDocument(filePath, file, STORAGE_BUCKETS.MIDIAS);

    const { data, error } = await supabase
      .from('course_media')
      .insert({
        course_id: courseId,
        media_name: file.name,
        media_url: publicUrl,
        media_type: metadata.mediaType,
        file_type: file.type,
        file_size: file.size,
        bucket_path: filePath,
        description: metadata.description,
        duration: metadata.duration,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao salvar mídia do curso:', error);
      // Tentar deletar o arquivo órfão
      await deleteDocument(filePath, STORAGE_BUCKETS.MIDIAS);
      throw new Error('Falha ao salvar informações da mídia.');
    }

    return {
        id: data.id,
        courseId: data.course_id,
        mediaName: data.media_name,
        mediaUrl: data.media_url,
        mediaType: data.media_type,
        fileType: data.file_type,
        fileSize: data.file_size,
        bucketPath: data.bucket_path,
        thumbnailUrl: data.thumbnail_url,
        duration: data.duration,
        description: data.description,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
  },

  /**
   * Deleta uma mídia de um curso.
   * @param mediaId - O ID da mídia a ser deletada.
   */
  async deleteCourseMedia(mediaId: string): Promise<void> {
    if (!mediaId) throw new Error('ID da mídia é obrigatório');

    // 1. Buscar a mídia para obter o caminho do arquivo
    const { data: media, error: fetchError } = await supabase
        .from('course_media')
        .select('media_url, bucket_path')
        .eq('id', mediaId)
        .single();

    if (fetchError || !media) {
        console.error('Erro ao buscar mídia para exclusão:', fetchError);
        throw new Error('Mídia não encontrada.');
    }

    // 2. Deletar o registro do banco de dados
    const { error: deleteDbError } = await supabase
        .from('course_media')
        .delete()
        .eq('id', mediaId);

    if (deleteDbError) {
        console.error('Erro ao deletar registro da mídia:', deleteDbError);
        throw new Error('Falha ao deletar a mídia.');
    }

    // 3. Deletar o arquivo do storage
    try {
        if (media.bucket_path) {
            await deleteDocument(media.bucket_path, STORAGE_BUCKETS.MIDIAS);
        }
    } catch (e) {
        console.error('Erro ao deletar arquivo de mídia do storage:', e);
        // Não falhar a operação se o arquivo não puder ser deletado
    }
  },

  /**
   * Atualiza metadados de uma mídia do curso.
   * @param mediaId - O ID da mídia.
   * @param metadata - Novos metadados.
   * @returns A mídia atualizada.
   */
  async updateCourseMedia(mediaId: string, metadata: {
    mediaName?: string;
    description?: string;
    duration?: number;
  }): Promise<CourseMedia> {
    if (!mediaId) throw new Error('ID da mídia é obrigatório');

    const { data, error } = await supabase
      .from('course_media')
      .update({
        media_name: metadata.mediaName,
        description: metadata.description,
        duration: metadata.duration,
      })
      .eq('id', mediaId)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar mídia:', error);
      throw new Error('Falha ao atualizar a mídia.');
    }

    return {
        id: data.id,
        courseId: data.course_id,
        mediaName: data.media_name,
        mediaUrl: data.media_url,
        mediaType: data.media_type,
        fileType: data.file_type,
        fileSize: data.file_size,
        bucketPath: data.bucket_path,
        thumbnailUrl: data.thumbnail_url,
        duration: data.duration,
        description: data.description,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
  },
};
