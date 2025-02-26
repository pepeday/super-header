import { useApi } from '@directus/extensions-sdk';
import { ref, watch } from 'vue';

export function useTranslation(helpKey: string, helpField: string) {
    const translation = ref<string | null>(null);
    const loading = ref(true);
    const api = useApi();

    const fetchTranslation = async () => {
        if (!helpKey || !helpField) {
            translation.value = null;
            loading.value = false;
            return;
        }

        try {
            const response = await api.get('/translations', {
                params: {
                    filter: {
                        key: {
                            _eq: helpKey
                        }
                    },
                    fields: [`${helpField}`]
                }
            });

            if (response.data.data && response.data.data.length > 0) {
                translation.value = response.data.data[0][helpField];
            }
        } catch (error) {
            console.error('Error fetching translation:', error);
            translation.value = null;
        } finally {
            loading.value = false;
        }
    };

    watch([() => helpKey, () => helpField], fetchTranslation, { immediate: true });

    return { translation, loading };
}
