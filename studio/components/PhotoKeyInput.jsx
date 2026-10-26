import React from 'react';
import {set, unset, useFormValue} from 'sanity';
import defaults from '../../content/default-content.json';

/** A normal photograph selector, backed by this document's editable image library. */
export function PhotoKeyInput(props) {
  const {value, onChange, readOnly, elementProps} = props;
  const currentPhotos = useFormValue(['photos']);
  const photos = Array.isArray(currentPhotos) && currentPhotos.length ? currentPhotos : defaults.photos;
  const choices = photos.filter((photo) => photo?.key);
  const missing = value && !choices.some((photo) => photo.key === value);
  return (
    <select
      {...elementProps}
      value={value || ''}
      disabled={readOnly}
      onChange={(event) => onChange(event.target.value ? set(event.target.value) : unset())}
      style={{width: '100%', padding: '0.75rem', border: '1px solid #9ca3af', borderRadius: 4, background: 'transparent', color: 'inherit', font: 'inherit'}}
    >
      <option value="">Choose a photograph…</option>
      {missing && <option value={value}>Missing photograph: {value}</option>}
      {choices.map((photo) => <option key={photo.key} value={photo.key}>{photo.title || photo.alt || photo.key}</option>)}
    </select>
  );
}
