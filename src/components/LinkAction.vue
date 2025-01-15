<script setup lang="ts">
import { render } from 'micromustache';
import { inject, ref } from 'vue';

interface Props {
	collection: string;
	meta: {
		url?: string;
	}
	value: any;
}

const props = withDefaults(defineProps<Props>(), {
	collection: '',
	meta: () => ({
		url: ''
	})
});

const values = inject('values', ref<Record<string, any>>({}));


// Define the method that will be called from the parent
const triggerAction = () => {
	const renderedUrl = render(props.meta?.url ?? '', values.value);
	
	if (renderedUrl) {
		window.open(renderedUrl, '_blank');
	} else {
		console.warn('No URL provided for LinkAction.');
	}
};

// Expose the method to the parent
defineExpose({ triggerAction });
</script>

