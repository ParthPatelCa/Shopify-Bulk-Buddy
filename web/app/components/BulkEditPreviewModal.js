import React, { useState } from 'react';
import { Modal, Text, Button, Stack, Divider, ButtonGroup } from '@shopify/polaris';

export default function BulkEditPreviewModal({ 
  isOpen, 
  onClose, 
  changes, 
  onConfirm,
  isLoading = false 
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  
  const chunkCount = Math.ceil(changes.length / 25);
  const estimatedTime = chunkCount * 0.5; // 500ms per chunk

  const handleConfirm = () => {
    if (!acknowledged) return;
    onConfirm();
  };

  const hasChanges = changes.length > 0;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Bulk Edit Preview"
      primaryAction={{
        content: isLoading ? 'Processing...' : 'Confirm Changes',
        onAction: handleConfirm,
        disabled: !acknowledged || !hasChanges || isLoading,
        loading: isLoading
      }}
      secondaryActions={[{
        content: 'Cancel',
        onAction: onClose,
        disabled: isLoading
      }]}
      large
    >
      <Modal.Section>
        {!hasChanges ? (
          <Text variant="bodyMd" color="subdued">
            No changes to preview. Modify some variant data first.
          </Text>
        ) : (
          <Stack vertical spacing="loose">
            <Stack vertical spacing="tight">
              <Text variant="headingMd">Summary</Text>
              <Text variant="bodyMd">
                {changes.length} variant{changes.length !== 1 ? 's' : ''} will be updated
                in {chunkCount} batch{chunkCount !== 1 ? 'es' : ''}
              </Text>
              <Text variant="bodyMd" color="subdued">
                Estimated processing time: ~{estimatedTime.toFixed(1)} seconds
              </Text>
            </Stack>

            <Divider />

            <Stack vertical spacing="tight">
              <Text variant="headingMd">Changes Preview</Text>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <Stack vertical spacing="extraTight">
                  {changes.slice(0, 10).map((change, index) => (
                    <div key={index} style={{ 
                      padding: '8px', 
                      border: '1px solid #e1e3e5', 
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <Text variant="bodyMd" fontWeight="semibold">
                        {change.title} - {change.sku || 'No SKU'}
                      </Text>
                      <Stack vertical spacing="extraTight">
                        {change.price !== undefined && (
                          <Text variant="bodySm" color="subdued">
                            Price: ${change.originalPrice} → ${change.price}
                          </Text>
                        )}
                        {change.inventory_quantity !== undefined && (
                          <Text variant="bodySm" color="subdued">
                            Inventory: {change.originalInventory} → {change.inventory_quantity}
                          </Text>
                        )}
                        {change.weight !== undefined && (
                          <Text variant="bodySm" color="subdued">
                            Weight: {change.originalWeight} → {change.weight}
                          </Text>
                        )}
                      </Stack>
                    </div>
                  ))}
                  {changes.length > 10 && (
                    <Text variant="bodySm" color="subdued" alignment="center">
                      ... and {changes.length - 10} more changes
                    </Text>
                  )}
                </Stack>
              </div>
            </Stack>

            <Divider />

            <Stack vertical spacing="tight">
              <Text variant="headingMd" color="critical">Important Notes</Text>
              <Stack vertical spacing="extraTight">
                <Text variant="bodySm">• Changes cannot be undone automatically</Text>
                <Text variant="bodySm">• Processing happens in batches to respect rate limits</Text>
                <Text variant="bodySm">• Large batches may take several minutes to complete</Text>
                <Text variant="bodySm">• Keep this tab open until processing completes</Text>
              </Stack>
              
              <ButtonGroup>
                <Button
                  plain
                  pressed={acknowledged}
                  onClick={() => setAcknowledged(!acknowledged)}
                >
                  {acknowledged ? '✓' : '☐'} I understand these changes cannot be undone
                </Button>
              </ButtonGroup>
            </Stack>
          </Stack>
        )}
      </Modal.Section>
    </Modal>
  );
}
