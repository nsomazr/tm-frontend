import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { mapsApi } from '../../api'
import FileUploadField from '../ui/FileUploadField'
import UploadProgressBar from '../ui/UploadProgressBar'
import { toast } from '../ui/toast'
import {
  detectLayerImportFileType,
  LAYER_IMPORT_ACCEPT,
  LAYER_IMPORT_CSV_HINT,
  LAYER_IMPORT_HINT,
} from '../../lib/layerImportFileType'
import type { MapLayer } from '../../types'

interface LayerBulkImportPanelProps {
  layer: MapLayer
  onSuccess?: (featureCount?: number) => void
  compact?: boolean
}

export default function LayerBulkImportPanel({
  layer,
  onSuccess,
  compact = false,
}: LayerBulkImportPanelProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const importMutation = useMutation({
    mutationFn: () => {
      if (!uploadFile) throw new Error('Choose a file first.')
      setUploadProgress(0)
      return mapsApi.bulkImport(
        layer.slug,
        uploadFile,
        detectLayerImportFileType(uploadFile.name),
        layer.mineral_slug,
        importMode,
        (percent) => setUploadProgress(percent),
      )
    },
    onSuccess: (res) => {
      setUploadProgress(null)
      setUploadFile(null)
      if (res.data?.status === 'failed') {
        toast.error('Import failed', {
          description: res.data.error_message || 'The upload could not be processed.',
        })
        return
      }
      if (res.data?.status === 'completed') {
        toast.success(
          importMode === 'append' ? 'Features added' : 'Layer data replaced',
          {
            description:
              importMode === 'append'
                ? `New features were appended to "${layer.name}".`
                : `Imported data into "${layer.name}".`,
          },
        )
        onSuccess?.()
        return
      }
      toast.info('Import started', {
        description: `Processing upload for "${layer.name}". Refresh in a moment if features do not appear.`,
      })
      onSuccess?.()
    },
    onError: (err: Error) => {
      setUploadProgress(null)
      toast.error('Import failed', { description: err.message })
    },
  })

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted mb-2">
          Import mode
        </p>
        <div className="segmented-control w-full max-w-md">
          <button
            type="button"
            onClick={() => setImportMode('append')}
            className={`segmented-btn flex-1 text-sm ${importMode === 'append' ? 'segmented-btn-active' : ''}`}
          >
            Append
          </button>
          <button
            type="button"
            onClick={() => setImportMode('replace')}
            className={`segmented-btn flex-1 text-sm ${importMode === 'replace' ? 'segmented-btn-active' : ''}`}
          >
            Replace all
          </button>
        </div>
        <p className="text-xs text-app-text-muted mt-2 leading-relaxed">
          {importMode === 'replace'
            ? 'All current features in this layer are removed before the upload is applied.'
            : 'New features from the file are added alongside existing features.'}
        </p>
      </div>

      <FileUploadField
        label="Data file"
        accept={LAYER_IMPORT_ACCEPT}
        value={uploadFile}
        onChange={(file) => {
          setUploadFile(file)
          setUploadProgress(null)
        }}
        placeholder="ZIP, GeoJSON, JSON, or CSV"
        hint={`${LAYER_IMPORT_HINT} · ${LAYER_IMPORT_CSV_HINT}`}
      />

      {importMutation.isPending && uploadProgress != null && (
        <UploadProgressBar
          progress={uploadProgress}
          label={
            uploadProgress >= 100
              ? 'Upload complete. Processing on server…'
              : 'Uploading file…'
          }
        />
      )}

      <button
        type="button"
        onClick={() => importMutation.mutate()}
        disabled={!uploadFile || importMutation.isPending}
        className="btn-primary text-sm"
      >
        {importMutation.isPending
          ? uploadProgress != null && uploadProgress < 100
            ? `Uploading ${uploadProgress}%…`
            : 'Processing…'
          : importMode === 'replace'
            ? 'Replace layer data'
            : 'Import into layer'}
      </button>
    </div>
  )
}
