export default function Footer() {
  return (
 <footer className="bg-light border-top mt-5">
  <div className="container py-4 text-center">
    <p className="mb-1">
      © {new Date().getFullYear()} True North Productions
    </p>
    <small className="text-muted">
      Building tools for learning, mastery, and discovery.
    </small>
  </div>
</footer>
  );
}