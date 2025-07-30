// src/app/api/options/list/[groupName]/route.ts
import { NextResponse } from 'next/server';
import { getOptionsByGroupName } from '@/lib/queries/options';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: { groupName?: string } }
) {
  const {groupName} = params;

  if (!groupName) {
    return errorResponse('groupName is required', 400);
  }

  try {
    const options = await getOptionsByGroupName(groupName);

    if (!options || options.length === 0) {
      return errorResponse('No options found', 404);
    }

    return NextResponse.json(options);
  } catch (error) {
    console.error('Failed to fetch options:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
