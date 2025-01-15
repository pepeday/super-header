<script setup lang="ts">
import { ref, inject, watch, onMounted } from 'vue';
import { useStores, useApi } from '@directus/composables';
import resolveMustacheString from '../composables/resolveMustacheString';

// Debug log to verify component mounting

interface Props {
	collection: string;
	meta: {
		defaultFields?: Array<{ field: string; value: string }>;
		selectedCollection?: string;
	}
	value: any;
}

const props = withDefaults(defineProps<Props>(), {
	collection: '',
	meta: {
		defaultFields: () => [],
		selectedCollection: ''
	}
});




const { useNotificationsStore } = useStores();
const notificationsStore = useNotificationsStore();
const api = useApi();

// State
const showDrawer = ref(false);
const isReady = ref(false);

// Rename to be more explicit about what values these are
const currentItemValues = inject('values', ref<Record<string, any>>({}));


// Update to use batch template resolution
const resolveTemplateValues = async (templates: string[]) => {


	const resolved = await resolveMustacheString(
		props.collection,
		templates,
		currentItemValues.value,
		api
	) as string[];


	return resolved;
};

// Update defaultEdits to handle async template resolution
const defaultEdits = ref<Record<string, any>>({});

const initializeDefaultEdits = async () => {
	if (!props.meta.defaultFields?.length) {
		defaultEdits.value = {};
		isReady.value = true;
		return;
	}

	const templates = props.meta.defaultFields.map(field => field.value);
	const resolvedValues = await resolveTemplateValues(templates);
	
	const edits: Record<string, any> = {};
	props.meta.defaultFields.forEach((fieldConfig, index) => {
		edits[fieldConfig.field] = resolvedValues[index];
	});
	
	defaultEdits.value = edits;
	isReady.value = true;
};

// Initialize on mount
onMounted(initializeDefaultEdits);

// Watch for changes in dependencies
watch([() => props.meta.defaultFields, currentItemValues], initializeDefaultEdits);

// Methods
const triggerAction = async () => {
	if (!isReady.value) {
		await initializeDefaultEdits();
	}
	showDrawer.value = true;
};


defineExpose({ triggerAction });


const handleDrawerSave = async (newEdits: Record<string, any>) => {
	try {
		await api.post(`/items/${props.meta.selectedCollection}`, {
			...defaultEdits.value,
			...newEdits,
		});

		showDrawer.value = false;

		notificationsStore.add({
			title: 'Item Created',
			type: 'success',
		});
	} catch (error) {
		console.error('Error in handleDrawerSave:', error);
		notificationsStore.add({
			title: 'Error',
			type: 'error',
			text: error instanceof Error ? error.message : 'Could not create item',
		});
	}
};


</script>

<template>

	<drawer-item v-model:active="showDrawer" :collection="props.meta.selectedCollection" :primary-key="'+'" :edits="defaultEdits"
		@input="handleDrawerSave" persistent />

</template>