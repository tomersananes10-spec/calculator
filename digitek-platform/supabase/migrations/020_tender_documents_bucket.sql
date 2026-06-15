-- 020_tender_documents_bucket.sql
-- Storage bucket + RLS for tender attachments (private).
-- Path convention: {tender_id}/{any}  →  ownership derived from first folder.

-- 1. Bucket (private — files served via signed URLs / direct DB join)
insert into storage.buckets (id, name, public)
values ('tender-documents', 'tender-documents', false)
on conflict (id) do nothing;

-- 2. RLS — only tender owner + admins can read/write objects under {tender_id}/...
create policy "Tender owners can upload tender documents"
  on storage.objects for insert
  with check (
    bucket_id = 'tender-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.tenders t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND t.owner_id = auth.uid()
      )
      OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    )
  );

create policy "Tender owners can read tender documents"
  on storage.objects for select
  using (
    bucket_id = 'tender-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.tenders t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND t.owner_id = auth.uid()
      )
      OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    )
  );

create policy "Tender owners can update tender documents"
  on storage.objects for update
  using (
    bucket_id = 'tender-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.tenders t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND t.owner_id = auth.uid()
      )
      OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    )
  );

create policy "Tender owners can delete tender documents"
  on storage.objects for delete
  using (
    bucket_id = 'tender-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.tenders t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND t.owner_id = auth.uid()
      )
      OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    )
  );
