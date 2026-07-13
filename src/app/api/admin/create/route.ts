import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { invalidateCache, invalidateCacheKey } from '@/lib/redis';

const roleSchema = z.enum(['USER', 'ADMIN']);
const accessTypeSchema = z.enum(['OPEN', 'VERIFY']);
const nameSchema = z.string().trim().min(1).max(200);
const emailSchema = z.string().trim().email().max(320);

const userCreateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: roleSchema.default('USER'),
});

const userUpdateSchema = z.object({
  name: nameSchema,
  role: roleSchema,
});

const courseSchema = z.object({
  title: z.string().trim().min(1).max(300),
  thumbnail: z.string().trim().max(2_000).optional().default(''),
  published: z.boolean().default(false),
  accessType: accessTypeSchema.default('VERIFY'),
});

const enrollmentSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
});

const createRequestSchema = z.discriminatedUnion('table', [
  z.object({ table: z.literal('user'), data: userCreateSchema }),
  z.object({ table: z.literal('course'), data: courseSchema }),
  z.object({ table: z.literal('enrollment'), data: enrollmentSchema }),
]);

const updateRequestSchema = z.discriminatedUnion('table', [
  z.object({ table: z.literal('user'), id: z.string().min(1), data: userUpdateSchema }),
  z.object({ table: z.literal('course'), id: z.string().min(1), data: courseSchema }),
  z.object({ table: z.literal('enrollment'), id: z.string().min(1), data: enrollmentSchema }),
]);

function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: 'Validation failed', details: error.flatten().fieldErrors },
    { status: 400 }
  );
}

function mutationError(error: unknown) {
  if ((error as { code?: string }).code === 'P2002') {
    return NextResponse.json({ error: 'Record already exists' }, { status: 409 });
  }

  console.error('Admin record mutation failed:', error);
  return NextResponse.json({ error: 'Admin record mutation failed' }, { status: 500 });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const parsed = createRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    let result;

    if (parsed.data.table === 'user') {
      const data = parsed.data.data;
      result = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          role: data.role,
        },
      });
    } else if (parsed.data.table === 'course') {
      const data = parsed.data.data;
      const existingCourse = await prisma.course.findFirst({
        where: { title: data.title, isDeleted: false },
        select: { id: true },
      });
      if (existingCourse) {
        return NextResponse.json({ error: 'A course with this title already exists' }, { status: 409 });
      }

      result = await prisma.course.create({
        data: {
          title: data.title,
          thumbnail: data.thumbnail || null,
          published: data.published,
          accessType: data.accessType,
        },
      });
      await invalidateCache('courses:*');
    } else {
      const data = parsed.data.data;
      result = await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: data.userId,
            courseId: data.courseId,
          },
        },
        create: data,
        update: { isDeleted: false, enrolledAt: new Date() },
      });
      await invalidateCacheKey(`courses:user:${data.userId}`);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return mutationError(error);
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const parsed = updateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    let result;

    if (parsed.data.table === 'user') {
      const data = parsed.data.data;
      if (parsed.data.id === session.user.id && data.role !== 'ADMIN') {
        return NextResponse.json({ error: 'You cannot remove your own admin role' }, { status: 400 });
      }

      result = await prisma.user.update({
        where: { id: parsed.data.id },
        data: { name: data.name, role: data.role },
      });
    } else if (parsed.data.table === 'course') {
      const data = parsed.data.data;
      const duplicate = await prisma.course.findFirst({
        where: {
          title: data.title,
          isDeleted: false,
          NOT: { id: parsed.data.id },
        },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'A course with this title already exists' }, { status: 409 });
      }

      result = await prisma.course.update({
        where: { id: parsed.data.id },
        data: {
          title: data.title,
          thumbnail: data.thumbnail || null,
          published: data.published,
          accessType: data.accessType,
        },
      });
      await invalidateCache('courses:*');
    } else {
      const data = parsed.data.data;
      result = await prisma.enrollment.update({
        where: { id: parsed.data.id },
        data: {
          userId: data.userId,
          courseId: data.courseId,
          isDeleted: false,
        },
      });
      await invalidateCacheKey(`courses:user:${data.userId}`);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return mutationError(error);
  }
}
