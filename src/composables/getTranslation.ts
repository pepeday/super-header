import { useApi } from '@directus/extensions-sdk';
import { ref, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';

interface Translation {
    id: string;
    key: string;
    language: string;
    [key: string]: any;  // For custom fields like 'html'
}

export function useTranslation(keyRef: string, fieldRef: string = 'value') {
    const api = useApi();
    const { locale } = useI18n();
    const translation = ref<string | null>(null);
    const loading = ref(false);
    const error = ref<Error | null>(null);

    const fetchTranslation = async () => {
        if (!keyRef || keyRef === '') {
            translation.value = null;
            return;
        }
        
        const translationKey = keyRef.startsWith('$t:') ? keyRef.substring(3) : keyRef;
        
        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<{ data: Translation[] }>(
                '/translations', {
                    params: {
                        'filter[key][_eq]': translationKey,
                        'filter[language][_eq]': locale.value,
                        fields: ['key', fieldRef],
                        limit: 1
                    }
                }
            );
            
            const translationItem = response.data?.data?.[0];
            if (translationItem && fieldRef in translationItem) {
                translation.value = translationItem[fieldRef];
            }
        } catch (err) {
            error.value = err as Error;
            translation.value = null;
        } finally {
            loading.value = false;
        }
    };

    watchEffect(() => {
        fetchTranslation();
    });

    return { translation, loading, error, refresh: fetchTranslation };
}
