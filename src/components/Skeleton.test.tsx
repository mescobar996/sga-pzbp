import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonPage } from '../components/Skeleton';

describe('Skeleton', () => {
  it('renders a single text skeleton by default', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders multiple skeletons when count > 1', () => {
    const { container } = render(<Skeleton count={3} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });

  it('renders a rectangular variant', () => {
    const { container } = render(<Skeleton variant="rectangular" />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toHaveClass('h-20');
  });

  it('renders a circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toHaveClass('rounded-full');
  });

  it('renders a card variant with inner elements', () => {
    const { container } = render(<Skeleton variant="card" />);
    expect(container.querySelector('.border-2')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(1);
  });

  it('applies custom width and height', () => {
    const { container } = render(<Skeleton width="200px" height="50px" />);
    const skeleton = container.querySelector('.animate-pulse') as HTMLElement;
    expect(skeleton.style.width).toBe('200px');
    expect(skeleton.style.height).toBe('50px');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="my-custom-class" />);
    const skeleton = container.querySelector('.my-custom-class');
    expect(skeleton).toBeInTheDocument();
  });
});

describe('SkeletonPage', () => {
  it('renders a card layout by default', () => {
    const { container } = render(<SkeletonPage />);
    expect(container.querySelector('.grid')).toBeInTheDocument();
  });

  it('renders a table layout', () => {
    const { container } = render(<SkeletonPage layout="table" />);
    expect(container.querySelector('.border-2')).toBeInTheDocument();
  });

  it('renders a list layout', () => {
    const { container } = render(<SkeletonPage layout="list" />);
    expect(container.querySelector('.flex-col')).toBeInTheDocument();
  });

  it('renders the specified number of cards', () => {
    const { container } = render(<SkeletonPage cardCount={5} />);
    const cards = container.querySelectorAll('.grid > div');
    expect(cards).toHaveLength(5);
  });
});
