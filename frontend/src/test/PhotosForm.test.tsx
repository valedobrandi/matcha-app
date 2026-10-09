import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PhotosForm from '@/components/photos-form'

describe('PhotosForm', () => {
    it('does name every photo and tell the profile photo apart when photos are listed', () => {
        render(
            <PhotosForm
                photoList={[
                    { id: 1, url: '/uploads/a.jpg', is_profile_photo: true },
                    { id: 2, url: '/uploads/b.jpg', is_profile_photo: false },
                ]}
                serverError={null}
                handleAddPhoto={vi.fn()}
                handleAsAvatar={vi.fn()}
                handlePatchPhoto={vi.fn()}
                handleDeletePhoto={vi.fn()}
                showFinish={false}
            />,
        )

        expect(screen.getByRole('img', { name: 'Your profile photo' })).toBeInTheDocument()
        expect(screen.getByRole('img', { name: 'Your photo' })).toBeInTheDocument()
    })
})
