using Dapper;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Repositories;

public class UserRepository : BaseRepository
{
    public UserRepository(IOptionsMonitor<DatabaseSettings> settings) : base(settings) { }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        const string sql = """
            SELECT user_id AS UserId, user_name AS UserName, first_name AS FirstName,
                   last_name AS LastName, password AS Password, password_salt AS PasswordSalt,
                   password_format AS PasswordFormat, use_ad_authentication AS UseAdAuthentication,
                   is_ldap_user AS IsLdapUser, domain AS Domain,
                   account_is_locked AS AccountIsLocked
            FROM shared.users
            WHERE user_name = @Username AND is_visible = true
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Username = username });
    }

    public async Task<User?> GetByUserIdAsync(int userId)
    {
        const string sql = """
            SELECT user_id AS UserId, user_name AS UserName, first_name AS FirstName,
                   last_name AS LastName, password AS Password, password_salt AS PasswordSalt,
                   password_format AS PasswordFormat, use_ad_authentication AS UseAdAuthentication,
                   is_ldap_user AS IsLdapUser, domain AS Domain,
                   account_is_locked AS AccountIsLocked
            FROM shared.users
            WHERE user_id = @UserId AND is_visible = true
            """;

        await using var connection = await CreateConnectionAsync();
        return await connection.QuerySingleOrDefaultAsync<User>(sql, new { UserId = userId });
    }

    public async Task<List<string>> GetUserRolesAsync(int userId)
    {
        const string sql = """
            SELECT r.role_name
            FROM shared.users_in_roles uir
            INNER JOIN shared.roles r ON uir.role_id = r.role_id
            WHERE uir.user_id = @UserId
            """;

        await using var connection = await CreateConnectionAsync();
        var roles = await connection.QueryAsync<string>(sql, new { UserId = userId });
        return roles.ToList();
    }
}
