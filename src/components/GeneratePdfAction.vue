<script setup lang="ts">
import { useApi } from '@directus/extensions-sdk';
import { inject, ref, computed } from 'vue';
import type { Action } from '../types';


interface Props {
  action: Action;
}

interface ErrorWithResponse {
  response?: {
    status: number;
    data: unknown;
    headers: unknown;
  };
}

interface FileInfo {
  filename_download: string;
  type: string;
}

const props = defineProps<Props>();
const api = useApi();
const values = inject('values', ref<Record<string, any>>({}));
const isLoading = ref(false);

// Computed properties to safely access meta values
const pdfField = computed(() => props.action.meta?.pdfField);
const generatorFlow = computed(() => {
  const flow = props.action.meta?.generatorFlow;
  // If flow is an object with a key property, use that, otherwise use the flow value directly
  return typeof flow === 'object' && flow !== null ? flow.key : flow;
});
const collection = computed(() => props.action.collection);
const fileRelationField = computed(() => props.action.meta?.fileRelationField);

const getFileInfo = async (fileId: string): Promise<FileInfo | null> => {
  try {
    const response = await api.get(`/files/${fileId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching file info:', JSON.stringify(error, null, 2));
    return null;
  }
};

const downloadFile = async (fileId: string) => {
  try {
    // Get file info first
    const fileInfo = await getFileInfo(fileId);
    if (!fileInfo) {
      throw new Error('Could not get file information');
    }

    const response = await api.get(`/assets/${fileId}`, {
      responseType: 'blob'
    });
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data], { type: fileInfo.type }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileInfo.filename_download);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', JSON.stringify(error, null, 2));
  }
};

const reloadItem = async () => {
  try {
    const response = await api.get(`/items/${collection.value}/${values.value.id}`);
    Object.assign(values.value, response.data.data);
  } catch (error) {
    console.error('Error reloading item:', JSON.stringify(error, null, 2));
  }
};

const findExistingFile = async (): Promise<string | null> => {
  try {
    if (!fileRelationField.value || !values.value.id) {
      return null;
    }

    const response = await api.get('/files', {
      params: {
        filter: {
          [fileRelationField.value]: {
            _eq: values.value.id
          }
        },
        limit: 1
      }
    });

    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0].id;
    }

    return null;
  } catch (error) {
    console.error('Error finding existing file:', JSON.stringify(error, null, 2));
    return null;
  }
};

const triggerAction = async () => {
  if (isLoading.value) return;
  
  // Validate required fields
  if (!fileRelationField.value || !generatorFlow.value || !collection.value) {
    console.error('Missing required configuration:', {
      fileRelationField: fileRelationField.value,
      generatorFlow: generatorFlow.value,
      collection: collection.value
    });
    return;
  }

  isLoading.value = true;

  try {
    // Check for existing file
    const existingFileId = await findExistingFile();
    
    if (existingFileId) {
      console.log('Found existing file:', existingFileId);
      await downloadFile(existingFileId);
      return;
    }

    // No existing file found, trigger flow to generate one
    console.log('No existing file found, triggering flow');
    await api.post(`/flows/trigger/${generatorFlow.value}`, {
      collection: collection.value,
      keys: [values.value.id.toString()]
    });

    // Check for newly created file
    const newFileId = await findExistingFile();
    if (newFileId) {
      console.log('New file generated:', newFileId);
      await downloadFile(newFileId);
    } else {
      throw new Error('Flow completed but no file was generated');
    }

  } catch (error) {
    console.error('Error in PDF generation:', JSON.stringify(error, null, 2));
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as ErrorWithResponse;
      if (err.response) {
        console.error('Error response:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
      }
    }
  } finally {
    isLoading.value = false;
  }
};

defineExpose({
  triggerAction,
  isLoading
});
</script>

<template>
  <!-- This component doesn't render anything visible -->
</template> 