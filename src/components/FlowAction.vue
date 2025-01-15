<script setup lang="ts">
import { useFlows } from '../composables/useFlows';
import { inject, ref } from 'vue';
import type { FlowIdentifier } from '../types';

interface Props {
	collection: string;
	meta: {
		flow?: string;
	}
	value: any;
}

const props = withDefaults(defineProps<Props>(), {
	collection: '',
	meta: () => ({
		flow: ''
	})
});

const values = inject('values', ref<Record<string, any>>({}));


interface FlowActionProps {
  label: string;
  icon?: string;
  type?: string;
  flow: FlowIdentifier;
  values: Record<string, any>;
}

const emit = defineEmits(['flow-executed']);

const { loading, runFlow } = useFlows();

const handleClick = async () => {
  try {
    const result = await runFlow(props.flow, props.values);
    emit('flow-executed', { success: true, flow: props.flow, result });
  } catch (error) {
    emit('flow-executed', { success: false, flow: props.flow, error });
  }
};
</script>