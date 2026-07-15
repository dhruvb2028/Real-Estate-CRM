-- =============================================================
-- EstateFlow CRM — Seed data (domain rows)
--
-- IMPORTANT: run scripts/seed-users.ts FIRST (it creates auth
-- users + org via the service-role API), then run this file in
-- the Supabase SQL editor. It looks profiles up by email.
-- =============================================================

do $$
declare
  v_org uuid;
  v_admin uuid;
  v_agent1 uuid;
  v_agent2 uuid;
  v_field uuid;
  v_social uuid;
  v_lead uuid;
  v_prop uuid;
  i int;
  lead_names text[] := array[
    'Rahul Sharma','Priya Verma','Amit Patel','Sneha Iyer','Vikram Singh',
    'Anjali Mehta','Rohan Kapoor','Kavita Joshi','Arjun Nair','Divya Reddy',
    'Sanjay Gupta','Neha Malhotra','Karan Chopra','Pooja Desai','Manish Kumar',
    'Ritu Agarwal','Aditya Rao','Shreya Banerjee','Nikhil Jain','Meera Pillai'
  ];
  lead_phones text[] := array[
    '+919810000001','+919810000002','+919810000003','+919810000004','+919810000005',
    '+919810000006','+919810000007','+919810000008','+919810000009','+919810000010',
    '+919810000011','+919810000012','+919810000013','+919810000014','+919810000015',
    '+919810000016','+919810000017','+919810000018','+919810000019','+919810000020'
  ];
  sources lead_source[] := array[
    '36acre','magicbricks','housing','facebook','instagram',
    'website','referral','manual','36acre','magicbricks',
    'facebook','instagram','website','whatsapp','manual',
    '36acre','housing','facebook','website','referral'
  ]::lead_source[];
  ptypes property_type[] := array[
    'apartment','villa','plot','commercial','rental',
    'apartment','apartment','villa','plot','rental',
    'apartment','commercial','villa','apartment','plot',
    'rental','apartment','villa','apartment','commercial'
  ]::property_type[];
  statuses lead_status[] := array[
    'new','new','contacted','interested','site_visit_scheduled',
    'negotiation','won','lost','not_responding','new',
    'contacted','interested','new','contacted','interested',
    'site_visit_scheduled','negotiation','new','contacted','new'
  ]::lead_status[];
  temps lead_temperature[] := array[
    'hot','warm','warm','hot','hot',
    'hot','hot','cold','cold','warm',
    'warm','hot','cold','warm','warm',
    'hot','hot','cold','warm','warm'
  ]::lead_temperature[];
  locations text[] := array[
    'Gurgaon','Noida','Dwarka','Gurgaon','South Delhi',
    'Noida Extension','Gurgaon','Faridabad','Ghaziabad','Dwarka',
    'Gurgaon','Connaught Place','Greater Noida','Saket','Sohna Road',
    'Golf Course Road','Gurgaon','Vasant Kunj','Noida','Cyber City'
  ];
  prop_titles text[] := array[
    'Emerald Heights 3BHK','Palm Grove Villa','Sunrise Plots Sector 89','Orbit Business Tower','Lakeview 2BHK Rental',
    'Skyline Residency 4BHK','The Meadows Villa','Green Acres Plot','Prime Square Retail','Maple Court 1BHK Rental'
  ];
  prop_locs text[] := array[
    'Golf Course Road, Gurgaon','Sohna Road, Gurgaon','Sector 89, Gurgaon','Cyber City, Gurgaon','Sector 104, Noida',
    'Dwarka Expressway, Gurgaon','Greater Noida West','New Gurgaon','MG Road, Gurgaon','Sector 62, Noida'
  ];
  prop_types2 property_type[] := array[
    'apartment','villa','plot','commercial','rental',
    'apartment','villa','plot','commercial','rental'
  ]::property_type[];
  prop_prices bigint[] := array[
    12500000, 32500000, 6800000, 45000000, 35000,
    21000000, 27500000, 9200000, 38000000, 22000
  ];
  prop_beds int[] := array[3, 4, 0, 0, 2, 4, 5, 0, 0, 1];
  agent uuid;
begin
  -- Look up seeded users (created by scripts/seed-users.ts)
  select organization_id, id into v_org, v_admin
    from profiles where email = 'admin@estateflow.demo';
  select id into v_agent1 from profiles where email = 'agent1@estateflow.demo';
  select id into v_agent2 from profiles where email = 'agent2@estateflow.demo';
  select id into v_field  from profiles where email = 'field@estateflow.demo';
  select id into v_social from profiles where email = 'social@estateflow.demo';

  if v_org is null then
    raise exception 'Seed users not found. Run: npm run seed:users first.';
  end if;

  update organizations
    set phone = '+911140000000',
        email = 'hello@estateflow.demo',
        address = 'DLF Cyber City, Gurgaon, Haryana'
    where id = v_org;

  -- ---------- Properties ----------
  for i in 1..10 loop
    insert into properties (
      organization_id, title, location, address, property_type, price,
      size_sqft, bedrooms, bathrooms, floor, furnishing, availability,
      description, amenities, tags, units_available, owner_name, owner_phone,
      developer_name, created_by
    ) values (
      v_org, prop_titles[i], prop_locs[i], prop_locs[i] || ', Haryana, India',
      prop_types2[i], prop_prices[i],
      600 + i * 240, nullif(prop_beds[i], 0), case when prop_beds[i] > 0 then prop_beds[i] - 1 else null end,
      case when prop_types2[i] in ('apartment','rental','commercial') then (i % 14 + 1)::text else null end,
      case when i % 3 = 0 then 'fully_furnished' when i % 3 = 1 then 'semi_furnished' else 'unfurnished' end::furnishing_status,
      case when i = 4 then 'hold' when i = 9 then 'sold' else 'available' end::property_availability,
      'Premium ' || lower(prop_types2[i]::text) || ' in ' || prop_locs[i] ||
        '. Well-connected location with excellent amenities, close to schools, hospitals and metro.',
      array['Parking','Power Backup','Security','Clubhouse','Gym'],
      array['featured'],
      case when prop_types2[i] = 'plot' then 12 else greatest(1, 6 - i) end,
      case when i % 2 = 0 then 'Suresh Malhotra' else null end,
      case when i % 2 = 0 then '+919899900011' else null end,
      case when i % 2 = 1 then 'DLF Ltd' else null end,
      v_admin
    ) returning id into v_prop;

    insert into property_images (organization_id, property_id, url, is_cover, sort_order)
    values
      (v_org, v_prop, 'https://placehold.co/800x600/0f766e/ffffff?text=' || replace(prop_titles[i], ' ', '+'), true, 0),
      (v_org, v_prop, 'https://placehold.co/800x600/134e4a/ffffff?text=Living+Room', false, 1),
      (v_org, v_prop, 'https://placehold.co/800x600/0369a1/ffffff?text=Bedroom', false, 2);
  end loop;

  -- ---------- Leads ----------
  for i in 1..20 loop
    agent := case when i % 2 = 0 then v_agent1 else v_agent2 end;
    insert into leads (
      organization_id, full_name, phone, email, source, property_type,
      budget_min, budget_max, preferred_location, status, temperature,
      assigned_agent_id, notes, next_followup_at, last_contacted_at, created_by, created_at
    ) values (
      v_org, lead_names[i], lead_phones[i],
      lower(replace(lead_names[i], ' ', '.')) || '@example.com',
      sources[i], ptypes[i],
      (30 + i * 5) * 100000::bigint, (60 + i * 8) * 100000::bigint,
      locations[i], statuses[i], temps[i],
      agent,
      case when i % 4 = 0 then 'Looking for a ready-to-move option near metro.' else null end,
      case when statuses[i] in ('contacted','interested','negotiation','site_visit_scheduled')
        then now() + (i % 5) * interval '1 day' + interval '2 hours' else null end,
      case when statuses[i] <> 'new' then now() - (i % 7) * interval '1 day' else null end,
      v_admin,
      now() - (20 - i) * interval '1 day'
    ) returning id into v_lead;

    insert into activities (organization_id, lead_id, actor_id, type, title, description)
    values
      (v_org, v_lead, v_admin, 'lead_created', 'Lead created',
       lead_names[i] || ' captured from ' || sources[i]::text),
      (v_org, v_lead, v_admin, 'lead_assigned', 'Lead assigned',
       'Assigned via round-robin');

    -- Sample calls for contacted+ leads
    if statuses[i] <> 'new' then
      insert into calls (
        organization_id, lead_id, agent_id, status, duration, outcome,
        started_at, ended_at, is_dry_run, call_sid
      ) values (
        v_org, v_lead, agent,
        case when i % 5 = 0 then 'agent_no_answer' else 'completed' end::call_status,
        case when i % 5 = 0 then null else 60 + i * 12 end,
        case when i % 5 = 0 then 'agent_no_answer' else 'connected' end::call_outcome,
        now() - (i % 7) * interval '1 day',
        now() - (i % 7) * interval '1 day' + (60 + i * 12) * interval '1 second',
        true, 'SEED' || i
      );
      insert into activities (organization_id, lead_id, actor_id, type, title, description)
      values (v_org, v_lead, agent, 'call_made', 'Bridge call',
        case when i % 5 = 0 then 'Agent did not answer' else 'Connected for ' || (60 + i * 12)::text || 's' end);
    end if;

    -- Sample follow-ups for active pipeline
    if statuses[i] in ('contacted','interested','site_visit_scheduled','negotiation') then
      insert into followups (organization_id, lead_id, agent_id, type, notes, due_at, status)
      values (
        v_org, v_lead, agent,
        case when i % 3 = 0 then 'call' when i % 3 = 1 then 'whatsapp' else 'site_visit' end::followup_type,
        'Follow up on ' || lower(statuses[i]::text),
        now() + (i % 4) * interval '1 day' + interval '3 hours',
        case when i % 6 = 0 then 'completed' else 'pending' end::followup_status
      );
    end if;
  end loop;

  -- ---------- Attendance (last 5 working days) ----------
  for i in 0..4 loop
    insert into attendance (
      organization_id, user_id, work_date, check_in_time, check_out_time,
      check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, status, notes
    ) values
      (v_org, v_agent1, current_date - i,
       (current_date - i) + time '09:25', (current_date - i) + time '18:30',
       28.4595, 77.0266, 28.4595, 77.0266, 'present'::attendance_status, null),
      (v_org, v_agent2, current_date - i,
       (current_date - i) + time '10:05', (current_date - i) + time '19:00',
       28.4595, 77.0266, 28.4595, 77.0266, (case when i % 2 = 0 then 'late' else 'present' end)::attendance_status, null),
      (v_org, v_field, current_date - i,
       (current_date - i) + time '09:15', (current_date - i) + time '17:45',
       28.5355, 77.3910, 28.5355, 77.3910, 'present'::attendance_status, 'Site visits in Noida')
    on conflict (user_id, work_date) do nothing;
  end loop;

  -- ---------- Social posts ----------
  insert into social_posts (organization_id, title, post_type, caption, status, scheduled_at, assigned_to, created_by)
  values
    (v_org, 'New launch teaser — Emerald Heights', 'instagram_reel',
     'Sneak peek of our newest 3BHK residences on Golf Course Road! #GurgaonRealEstate', 'scheduled',
     now() + interval '2 days', v_social, v_admin),
    (v_org, 'Client testimonial — the Kapoor family', 'instagram_post',
     'Another happy family finds home with EstateFlow.', 'draft', null, v_social, v_admin),
    (v_org, 'Market update: NCR Q3', 'linkedin_post',
     'NCR residential prices up 8% QoQ. What that means for buyers.', 'idea', null, v_social, v_admin),
    (v_org, 'Weekend site visit stories', 'story',
     'Live from Palm Grove Villas this weekend!', 'scheduled', now() + interval '4 days', v_social, v_admin),
    (v_org, 'Festive offer announcement', 'facebook_post',
     'Zero registration charges this festive season on select units.', 'published', now() - interval '3 days', v_social, v_admin);

  -- ---------- Sample site-visit task ----------
  insert into tasks (organization_id, assigned_to, title, description, task_type, due_at, created_by)
  values (v_org, v_field, 'Site visit — Sunrise Plots Sector 89',
    'Accompany Vikram Singh for plot inspection', 'site_visit', now() + interval '1 day', v_admin);

  -- ---------- Notifications ----------
  insert into notifications (organization_id, user_id, type, title, body, link)
  values
    (v_org, v_agent1, 'new_lead_assigned', 'New lead assigned',
     'Rahul Sharma from 36 Acre has been assigned to you', '/leads'),
    (v_org, v_agent2, 'followup_due', 'Follow-up due',
     'Follow-up with Priya Verma is due today', '/followups'),
    (v_org, v_admin, 'attendance_issue', 'Late check-in',
     'An agent checked in after 10:00 AM today', '/attendance');

  raise notice 'Seed complete for org %', v_org;
end;
$$;
