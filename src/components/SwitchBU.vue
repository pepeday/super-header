<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { useI18n } from 'vue-i18n';

interface Props {
  collection: string;
  onBusinessUnitChanged?: () => Promise<void>;
}

interface Organization {
  id: string;
  name: string;
}

interface BusinessUnit {
  id: string;
  name: string;
  organization_id: string;
}


const props = withDefaults(defineProps<Props>(), {
  collection: '',
});

const { t } = useI18n();
const api = useApi();
const showDialog = ref(false);
const currentBusinessUnit = ref<string>('');
const organizations = ref<Organization[]>([]);
const businessUnitsMap = ref<Map<string, BusinessUnit[]>>(new Map());
const selectedOrganizationId = ref<string | null>(null);
const isLoading = ref(false);

const filteredBusinessUnits = computed(() => {
  if (!selectedOrganizationId.value) return [];
  return businessUnitsMap.value.get(selectedOrganizationId.value) || [];
});

const selectedBusinessUnitId = ref<string | null>(null);

const fetchBusinessUnits = async () => {
  try {
    isLoading.value = true;
    const response = await api.get('/users/me', {
      params: {
        fields: [
          'business_unit_owner_id.id',
          'business_unit_owner_id.name',
          'business_unit_owner_id.organization_id.id',
          'business_units_available.business_units_id.id',
          'business_units_available.business_units_id.name',
          'business_units_available.business_units_id.organization_id.id',
          'business_units_available.business_units_id.organization_id.name'
        ]
      }
    });

    const data = response.data.data;
    
    // Ensure we have the required data before proceeding
    if (!data?.business_unit_owner_id) {
      console.warn('Missing business unit data:', JSON.stringify(data, null, 2));
      return;
    }

    // Set all reactive properties within a single tick
    await nextTick(() => {
      currentBusinessUnit.value = data.business_unit_owner_id.name;
      const currentOrgId = data.business_unit_owner_id.organization_id.id;
      const currentBUId = data.business_unit_owner_id.id;
      
      // Create maps
      const orgsMap = new Map<string, Organization>();
      const busMap = new Map<string, BusinessUnit[]>();

      // Filter out null values and map the data
      data.business_units_available
        .filter((item: any) => item.business_units_id !== null)
        .forEach((item: any) => {
          const bu = item.business_units_id;
          const org = bu.organization_id;

          if (!orgsMap.has(org.id)) {
            orgsMap.set(org.id, {
              id: org.id,
              name: org.name
            });
            busMap.set(org.id, []);
          }

          busMap.get(org.id)?.push({
            id: bu.id,
            name: bu.name,
            organization_id: org.id
          });
        });

      organizations.value = Array.from(orgsMap.values());
      businessUnitsMap.value = busMap;
      selectedOrganizationId.value = currentOrgId;
      selectedBusinessUnitId.value = currentBUId;
    });

  } catch (error) {
    console.error('Error fetching business units:', JSON.stringify(error, null, 2));
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  if (!selectedBusinessUnitId.value) return;

  try {
    isLoading.value = true;
    
    // Update both the business_unit_owner_id and business_units_write
    await api.patch('/users/me', {
      business_unit_owner_id: selectedBusinessUnitId.value,
      // Set business_units_write to only contain the selected business unit
      business_units_write: [selectedBusinessUnitId.value]
    });

    // Call the callback if provided
    if (props.onBusinessUnitChanged) {
      await props.onBusinessUnitChanged();
    }

    showDialog.value = false;
    
    // Show a loading overlay before reload
    const loadingElement = document.createElement('div');
    loadingElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--theme--background);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    loadingElement.innerHTML = '<div class="v-progress-circular primary" style="width: 48px; height: 48px;"></div>';
    document.body.appendChild(loadingElement);
    
    // Reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 300);

  } catch (error) {
    console.error('Error updating business unit:', error);
  }
};

// Method that will be called from the parent
const triggerAction = async () => {
  // Reset state before showing dialog
  selectedOrganizationId.value = null;
  selectedBusinessUnitId.value = null;
  organizations.value = [];
  businessUnitsMap.value = new Map();
  
  showDialog.value = true;
  await fetchBusinessUnits();
};

// Watch for organization changes and update business units loading state
watch(selectedOrganizationId, (newValue) => {
  if (newValue) {
    selectedBusinessUnitId.value = null;
  }
});

// Expose the method to the parent
defineExpose({ triggerAction });
</script>

<template>
  <v-dialog v-model="showDialog" @esc="showDialog = false">
    <v-card>
      <v-card-title>{{ t('switch_business_unit') }}</v-card-title>
      <v-card-text>
        <v-text>
          {{ t('switch_business_unit_description') }}
        </v-text>
        <div class="field">
          <div class="field-label">{{ t('organization') }}</div>
          <v-select
            v-model="selectedOrganizationId"
            :items="organizations"
            item-value="id"
            item-text="name"
            :placeholder="t('select_organization')"
            :loading="isLoading"
            :disabled="isLoading"
          />
        </div>

        <div class="field">
          <div class="field-label">{{ t('business_unit') }}</div>
          <v-select
            v-model="selectedBusinessUnitId"
            :items="filteredBusinessUnits"
            item-value="id"
            item-text="name"
            :placeholder="t('select_business_unit')"
            :disabled="!selectedOrganizationId || isLoading"
            :loading="isLoading"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-button secondary @click="showDialog = false">
          {{ t('cancel') }}
        </v-button>
        <v-button :disabled="!selectedBusinessUnitId" @click="handleSave">
          {{ t('save') }}
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.field {
  margin-top: 20px;
}

.field-label {
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 16px;
}
</style>
