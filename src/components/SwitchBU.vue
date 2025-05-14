<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { useI18n } from 'vue-i18n';
import { useFlows } from '../composables/useFlows';


interface Props {
  collection: string;
  onBusinessUnitChanged?: () => Promise<void>;
}

interface Organization {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  organization_id: string;
}

interface FlowIdentifier {
  key: string;
}

const props = withDefaults(defineProps<Props>(), {
  collection: '',
});

const { t } = useI18n();
const api = useApi();
const showDialog = ref(false);
const organizations = ref<Organization[]>([]);
const teamsMap = ref<Map<string, Team[]>>(new Map());
const selectedOrganizationId = ref<string | null>(null);
const isLoading = ref(false);

// Get flow handling functionality
const { runFlow } = useFlows();

// Computed property for filtered teams based on selected organization
const filteredTeams = computed(() => {
  if (!selectedOrganizationId.value) return [];
  return teamsMap.value.get(selectedOrganizationId.value) || [];
});

const selectedTeamId = ref<string | null>(null);

const fetchTeams = async () => {
  try {
    isLoading.value = true;
    const response = await api.get('/users/me', {
      params: {
        fields: [
          'team.id',
          'team.name',
          'team.organization_id.id',
          'team.organization_id.name',
          'teams_available.teams_id.id',
          'teams_available.teams_id.name',
          'teams_available.teams_id.organization_id.id',
          'teams_available.teams_id.organization_id.name'
        ]
      }
    });

    const data = response.data.data;
    
    // Create maps
    const orgsMap = new Map<string, Organization>();
    const teamsByOrg = new Map<string, Map<string, Team>>();

    // If user has a current team, add it first
    if (data?.team) {
      const currentOrg = data.team.organization_id;
      const currentTeam = {
        id: data.team.id,
        name: data.team.name,
        organization_id: currentOrg.id
      };

      orgsMap.set(currentOrg.id, {
        id: currentOrg.id,
        name: currentOrg.name
      });
      teamsByOrg.set(currentOrg.id, new Map([[currentTeam.id, currentTeam]]));
    }

    // Process available teams
    if (data?.teams_available) {
      data.teams_available
        .filter((item: any) => item.teams_id !== null)
        .forEach((item: any) => {
          const team = item.teams_id;
          const org = team.organization_id;

          // Add organization if not exists
          if (!orgsMap.has(org.id)) {
            orgsMap.set(org.id, {
              id: org.id,
              name: org.name
            });
            teamsByOrg.set(org.id, new Map());
          }

          // Add team to organization's team list
          const teamsMap = teamsByOrg.get(org.id);
          teamsMap?.set(team.id, {
            id: team.id,
            name: team.name,
            organization_id: org.id
          });
        });
    }

    // Update reactive refs
    organizations.value = Array.from(orgsMap.values());
    teamsMap.value = new Map(
      Array.from(teamsByOrg.entries()).map(([orgId, teamsMap]) => [orgId, Array.from(teamsMap.values())])
    );
    
    // Set default selections if user has a current team
    if (data?.team) {
      await nextTick();
      selectedOrganizationId.value = data.team.organization_id.id;
      await nextTick();
      selectedTeamId.value = data.team.id;
    }

  } catch (error) {
    console.error('Error fetching teams:', JSON.stringify(error, null, 2));
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  if (!selectedTeamId.value) return;

  try {
    isLoading.value = true;
    
    // Call the flow and wait for completion
    const { data } = await api.post(`/flows/trigger/83b4ee32-f5a0-4434-a8b3-ee4a8fe23f0d`, {
      collection: 'teams',
      keys: [selectedTeamId.value.toString()]
    });

    // If we get here, flow completed successfully
    showDialog.value = false;
    window.location.reload();

  } catch (error) {
    console.error('Error switching team:', JSON.stringify(error, null, 2));
    isLoading.value = false; // Reset loading state only on error
  }
};

// Watch for organization changes to reset team selection
watch(selectedOrganizationId, (newValue) => {
  // Only reset team selection if user changes the organization
  if (newValue && selectedTeamId.value) {
    const team = filteredTeams.value.find(team => team.id === selectedTeamId.value);
    if (!team) {
      selectedTeamId.value = null;
    }
  }
});

// Method that will be called from the parent
const triggerAction = async () => {
  showDialog.value = true;
  await fetchTeams();
};

// Expose the method to the parent
defineExpose({ triggerAction });
</script>

<template>
  <v-dialog v-model="showDialog" @esc="showDialog = false">
    <v-card>
      <v-card-title>{{ t('switch_team') }}</v-card-title>
      <v-card-text>
        <div class="field">
          <div class="field-label">{{ t('organization',"Organization") }}</div>
          <v-select
            v-model="selectedOrganizationId"
            :items="organizations"
            item-value="id"
            item-text="name"
            :placeholder="t('select_organization', 'Select Organization')"
            :loading="isLoading"
            :disabled="isLoading"
          />
        </div>

        <div class="field">
          <div class="field-label">{{ t('team', 'Team') }}</div>
          <v-select
            v-model="selectedTeamId"
            :items="filteredTeams"
            item-value="id"
            item-text="name"
            :placeholder="t('select_team', 'Select Team')"
            :disabled="!selectedOrganizationId || isLoading"
            :loading="isLoading"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-button secondary @click="showDialog = false">
          {{ t('cancel', 'Cancel') }}
        </v-button>
        <v-button :disabled="!selectedTeamId" @click="handleSave">
          {{ t('save', 'Save') }}
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
