package demo.leave.user.model;

import java.util.UUID;

public record AppUser(UUID id, String email, String displayName, String passwordHash, String role) {
}
