import React, { useState } from 'react';
import {
  ArrayInput,
  SimpleFormIterator,
  TextInput,
  useRecordContext,
} from 'react-admin';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Divider,
  IconButton,
  Paper
} from '@mui/material';
import { Add, Delete, Visibility, VisibilityOff } from '@mui/icons-material';

const commonIcons = [
  '🔧', '🚗', '📱', '📷', '🖥️', '🔊', '🗺️', '🎮', '⚙️', '📦',
  '🔌', '💡', '🎵', '📡', '🛰️', '⭐', '🔋', '🎯', '🎨', '🌐'
];

const StructuredDescriptionEditor = ({ source = "structuredDescription.sections" }) => {
  const [showPreview, setShowPreview] = useState(false);
  const record = useRecordContext();

  const PreviewSection = ({ record }) => {
    if (!record.structuredDescription?.sections) {
      return (
        <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="textSecondary" align="center">
            No structured description sections added yet. Add sections below to see preview.
          </Typography>
        </Paper>
      );
    }

    return (
      <Box sx={{ space: 3 }}>
        {record.structuredDescription.sections.map((section, index) => (
          <Card key={index} sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'primary.main', mb: 2, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>{section.icon}</span>
                {section.title}
              </Typography>
              <Box sx={{ space: 2 }}>
                {section.points?.map((point, pointIndex) => (
                  <Box key={pointIndex} sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ width: 8, height: 8, bgcolor: 'primary.main', borderRadius: '50%', mt: 1, mr: 2, flexShrink: 0 }} />
                    <Typography variant="body1" sx={{ lineHeight: 1.6 }}>{point}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  // Removed unused IconSelector component

  return (
    <Box>
      {/* Preview Toggle */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Structured Product Description</Typography>
        <Button
          startIcon={showPreview ? <VisibilityOff /> : <Visibility />}
          onClick={() => setShowPreview(!showPreview)}
          variant="outlined"
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </Button>
      </Box>

      {/* Preview */}
      {showPreview && (
        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Frontend Preview
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <PreviewSection record={record || { structuredDescription: { sections: [] } }} />
          </CardContent>
        </Card>
      )}

      {/* Editor */}
      <Card sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Description Sections
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Create structured sections with icons and bullet points that will display beautifully on the product page.
        </Typography>

        <ArrayInput source={source}>
          <SimpleFormIterator
            addButton={
              <Button startIcon={<Add />} variant="contained">
                Add Section
              </Button>
            }
            removeButton={
              <IconButton color="error">
                <Delete />
              </IconButton>
            }
          >
            <Card sx={{ p: 3, mb: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={3}>
                {/* Section Title */}
                <Grid item xs={12} md={6}>
                  <TextInput
                    source="title"
                    label="Section Title"
                    fullWidth
                    helperText="e.g., 'Montaj ușor, tip Plug & Play'"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '1.1rem',
                        minHeight: '56px'
                      }
                    }}
                  />
                </Grid>

                {/* Section Icon */}
                <Grid item xs={12} md={6}>
                  <TextInput
                    source="icon"
                    label="Section Icon (Emoji)"
                    fullWidth
                    helperText="Choose an emoji that represents this section"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '1.5rem',
                        minHeight: '56px'
                      }
                    }}
                  />
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      Quick select:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {commonIcons.slice(0, 10).map((icon, index) => (
                        <Button
                          key={index}
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            // This would need to be handled by the form context
                            // For now, it's just visual guidance
                          }}
                          sx={{
                            minWidth: 36,
                            height: 36,
                            fontSize: '1.2rem',
                            p: 0.5
                          }}
                        >
                          {icon}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                </Grid>

                {/* Section Points */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Section Content Points
                  </Typography>
                  <ArrayInput source="points">
                    <SimpleFormIterator
                      addButton={
                        <Button startIcon={<Add />} size="small">
                          Add Point
                        </Button>
                      }
                      removeButton={
                        <IconButton size="small" color="error">
                          <Delete />
                        </IconButton>
                      }
                    >
                      <TextInput
                        multiline
                        rows={3}
                        fullWidth
                        label="Content Point"
                        helperText="Describe a feature or benefit - this will show as a bullet point"
                        sx={{
                          mb: 2,
                          '& .MuiOutlinedInput-root': {
                            fontSize: '1rem'
                          },
                          '& textarea': {
                            fontSize: '1rem !important'
                          }
                        }}
                      />
                    </SimpleFormIterator>
                  </ArrayInput>
                </Grid>
              </Grid>
            </Card>
          </SimpleFormIterator>
        </ArrayInput>

        {/* Usage Instructions */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            💡 How to create great structured descriptions:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            • <strong>Section Title:</strong> Use clear, benefit-focused titles (e.g., "Easy Plug & Play Installation")
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            • <strong>Icon:</strong> Choose relevant emojis that match your section theme
          </Typography>
          <Typography variant="body2">
            • <strong>Points:</strong> Write clear, concise benefits or features that customers care about
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default StructuredDescriptionEditor;