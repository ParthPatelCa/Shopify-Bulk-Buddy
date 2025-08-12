import React, { useState, useEffect } from 'react';
import { 
  Select, 
  Button, 
  Stack, 
  Text, 
  Modal, 
  TextField, 
  Checkbox,
  ButtonGroup,
  Toast
} from '@shopify/polaris';

export default function PresetManager({ 
  onApplyPreset, 
  currentFilters = {}, 
  currentColumns = [],
  showToast 
}) {
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeColumns, setIncludeColumns] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load presets on component mount
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const response = await fetch('/api/presets');
      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
      showToast?.('Failed to load presets', true);
    }
  };

  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) {
      showToast?.('Preset name is required', true);
      return;
    }

    setIsLoading(true);
    
    try {
      const presetData = {
        name: newPresetName.trim(),
        description: newPresetDescription.trim(),
        config: {}
      };

      if (includeFilters) {
        presetData.config.filters = currentFilters;
      }

      if (includeColumns) {
        presetData.config.columns = currentColumns;
      }

      const response = await fetch('/api/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(presetData)
      });

      if (response.ok) {
        const result = await response.json();
        setPresets(prev => [...prev, result.preset]);
        setIsCreateModalOpen(false);
        setNewPresetName('');
        setNewPresetDescription('');
        showToast?.(`Preset "${presetData.name}" created successfully`);
      } else {
        const error = await response.json();
        showToast?.(error.error || 'Failed to create preset', true);
      }
    } catch (error) {
      console.error('Failed to create preset:', error);
      showToast?.('Failed to create preset', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = async () => {
    if (!selectedPreset) return;

    const preset = presets.find(p => p.id === selectedPreset);
    if (!preset) return;

    try {
      // Apply the preset configuration
      if (onApplyPreset) {
        onApplyPreset(preset.config);
        showToast?.(`Preset "${preset.name}" applied`);
      }
    } catch (error) {
      console.error('Failed to apply preset:', error);
      showToast?.('Failed to apply preset', true);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPreset) return;

    const preset = presets.find(p => p.id === selectedPreset);
    if (!preset) return;

    if (!confirm(`Delete preset "${preset.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/presets/${selectedPreset}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPresets(prev => prev.filter(p => p.id !== selectedPreset));
        setSelectedPreset('');
        showToast?.(`Preset "${preset.name}" deleted`);
      } else {
        const error = await response.json();
        showToast?.(error.error || 'Failed to delete preset', true);
      }
    } catch (error) {
      console.error('Failed to delete preset:', error);
      showToast?.('Failed to delete preset', true);
    }
  };

  const presetOptions = [
    { label: 'Select a preset...', value: '' },
    ...presets.map(preset => ({
      label: preset.name,
      value: preset.id
    }))
  ];

  const selectedPresetData = presets.find(p => p.id === selectedPreset);

  return (
    <>
      <Stack alignment="center" spacing="tight">
        <div style={{ minWidth: '200px' }}>
          <Select
            label=""
            options={presetOptions}
            value={selectedPreset}
            onChange={setSelectedPreset}
            placeholder="Select preset..."
          />
        </div>
        
        <ButtonGroup segmented>
          <Button
            disabled={!selectedPreset}
            onClick={handleApplyPreset}
          >
            Apply
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
          >
            Save Current
          </Button>
          <Button
            disabled={!selectedPreset}
            onClick={handleDeletePreset}
            destructive
          >
            Delete
          </Button>
        </ButtonGroup>
      </Stack>

      {selectedPresetData && (
        <div style={{ marginTop: '8px' }}>
          <Text variant="bodySm" color="subdued">
            {selectedPresetData.description || 'No description'}
          </Text>
          {selectedPresetData.config && (
            <div style={{ marginTop: '4px' }}>
              <Text variant="bodySm" color="subdued">
                Includes: {[
                  selectedPresetData.config.filters ? 'Filters' : null,
                  selectedPresetData.config.columns ? 'Columns' : null
                ].filter(Boolean).join(', ') || 'No configuration'}
              </Text>
            </div>
          )}
        </div>
      )}

      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Save Current Configuration as Preset"
        primaryAction={{
          content: 'Save Preset',
          onAction: handleCreatePreset,
          disabled: !newPresetName.trim() || isLoading,
          loading: isLoading
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setIsCreateModalOpen(false),
          disabled: isLoading
        }]}
      >
        <Modal.Section>
          <Stack vertical spacing="loose">
            <TextField
              label="Preset Name"
              value={newPresetName}
              onChange={setNewPresetName}
              placeholder="e.g., High Priority Items"
              autoComplete="off"
            />
            
            <TextField
              label="Description (optional)"
              value={newPresetDescription}
              onChange={setNewPresetDescription}
              placeholder="Brief description of this preset"
              multiline={2}
              autoComplete="off"
            />

            <Stack vertical spacing="tight">
              <Text variant="headingMd">Include in Preset</Text>
              
              <Checkbox
                label={`Current filters (${Object.keys(currentFilters).length} active)`}
                checked={includeFilters}
                onChange={setIncludeFilters}
              />
              
              <Checkbox
                label={`Column configuration (${currentColumns.length} columns)`}
                checked={includeColumns}
                onChange={setIncludeColumns}
              />
            </Stack>

            <Text variant="bodySm" color="subdued">
              This preset will save your current view settings and can be quickly applied later.
            </Text>
          </Stack>
        </Modal.Section>
      </Modal>
    </>
  );
}
