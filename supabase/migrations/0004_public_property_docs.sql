-- =============================================================
-- EstateFlow CRM — 0004: include documents in public share RPC
-- =============================================================

create or replace function get_public_property(p_share_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'location', p.location,
    'address', p.address,
    'property_type', p.property_type,
    'price', p.price,
    'size_sqft', p.size_sqft,
    'bedrooms', p.bedrooms,
    'bathrooms', p.bathrooms,
    'floor', p.floor,
    'furnishing', p.furnishing,
    'availability', p.availability,
    'description', p.description,
    'amenities', p.amenities,
    'organization_name', o.name,
    'organization_phone', o.phone,
    'images', coalesce(
      (
        select jsonb_agg(jsonb_build_object('url', pi.url, 'is_cover', pi.is_cover)
               order by pi.is_cover desc, pi.sort_order)
        from property_images pi
        where pi.property_id = p.id
      ),
      '[]'::jsonb
    ),
    'documents', coalesce(
      (
        select jsonb_agg(jsonb_build_object('name', pd.name, 'url', pd.url)
               order by pd.created_at)
        from property_documents pd
        where pd.property_id = p.id
      ),
      '[]'::jsonb
    )
  )
  from properties p
  join organizations o on o.id = p.organization_id
  where p.share_token = p_share_token;
$$;

grant execute on function get_public_property(text) to anon, authenticated;
